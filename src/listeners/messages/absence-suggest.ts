import { App } from '@slack/bolt';
import axios from 'axios';
import * as chrono from 'chrono-node';
import { addMonths, startOfDay } from 'date-fns';
import jwt from 'jsonwebtoken';
import {
  generateTimeText,
  isGenericMessageEvent,
  isWeekendInRange,
} from '../../helpers';
import { DayPart } from '../../types';

export default function suggestAbsence(app: App) {
  app.message('off', async ({ message, say }) => {
    // Filter out message events with subtypes (see https://api.slack.com/events/message)
    // Is there a way to do this in listener middleware with current type system?
    if (!isGenericMessageEvent(message)) return;
    if (message.channel !== process.env.SLACK_CHANNEL) return;
    if (!message.blocks) return;

    const serviceAccountKey = JSON.parse(
      Buffer.from(process.env.SERVICE_ACCOUNT_KEY_BASE64!, 'base64').toString(),
    );
    const jwtToken = jwt.sign(
      { scope: 'https://www.googleapis.com/auth/cloud-translation' },
      serviceAccountKey.private_key.replace(/\\n/gm, '\n'),
      {
        algorithm: 'RS256',
        issuer: serviceAccountKey.client_email,
        audience: serviceAccountKey.token_uri,
        expiresIn: '1h',
      },
    );
    const accessTokenResponse = await axios.post(
      'https://oauth2.googleapis.com/token',
      {
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: jwtToken,
      },
    );
    const accessToken = accessTokenResponse.data.access_token;

    const result = await axios.post(
      `https://translation.googleapis.com/v3/projects/${serviceAccountKey.project_id}:translateText`,
      {
        sourceLanguageCode: 'vi',
        targetLanguageCode: 'en',
        contents: message.text,
        mimeType: 'text/plain',
      },
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      },
    );
    const translatedText = result.data.translations[0].translatedText;
    console.log('translatedText', translatedText);

    const ranges = chrono.parse(translatedText);
    if (ranges.length === 0) return;
    const startDate = ranges[0].start.date();
    const endDate = ranges[0].end?.date() || startDate;
    const today = startOfDay(new Date());

    const startDateString = startDate.toISOString().split('T')[0];
    const endDateString = endDate.toISOString().split('T')[0];
    const isSingleMode = startDateString === endDateString;

    console.log('startDate', startDate);
    console.log('endDate', endDate);
    console.log('startDate.getHours()', startDate.getHours());
    console.log('endDate.getHours()', endDate.getHours());

    if (!startDate) return;
    let dayPart = DayPart.ALL;
    if (
      startDate.getTime() ===
      new Date(new Date(startDate).setHours(6, 0, 0, 0)).getTime()
    ) {
      dayPart = DayPart.MORNING;
    }

    if (
      startDate.getTime() ===
      new Date(new Date(startDate).setHours(15, 0, 0, 0)).getTime()
    ) {
      dayPart = DayPart.AFTERNOON;
    }

    if (startDate < today) return;
    if (isWeekendInRange(startDate, endDate)) return;
    if (endDate < startDate) return;
    if (startDate > addMonths(today, 3)) return;
    if (endDate > addMonths(today, 3)) return;
    if (!isSingleMode && dayPart !== DayPart.ALL) return;

    const timeText = generateTimeText(startDate, endDate, dayPart);

    await say({
      thread_ts: message.ts,
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `>${message.text}\n<@${message.user}>, are you going to be absent on *${timeText}*?`,
          },
        },
        {
          type: 'actions',
          elements: [
            {
              type: 'button',
              action_id: 'absence-suggestion-yes',
              text: {
                type: 'plain_text',
                emoji: true,
                text: 'Yes',
              },
              style: 'primary',
              value: JSON.stringify({
                startDateString,
                endDateString,
                dayPart,
                reason: message.text,
                authorId: message.user,
              }),
            },
            {
              type: 'button',
              action_id: 'absence-suggestion-no',
              text: {
                type: 'plain_text',
                emoji: true,
                text: 'No, submit myself',
              },
            },
          ],
        },
      ],
      text: `Are you going to be absent on ${timeText}?`,
    });
  });
}
