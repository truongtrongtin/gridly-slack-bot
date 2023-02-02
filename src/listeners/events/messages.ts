import { App } from '@slack/bolt';
import * as chrono from 'chrono-node';
import { addMonths, format } from 'date-fns';
import { generateTimeText, isWeekendInRange } from '../../helpers';
import getAccessTokenFromServiceAccount from '../../services/get-access-token-from-service-account';
import { serviceAccountKey } from '../../services/service-account-key';
import { AbsencePayload, DayPart } from '../../types';

export default function messages(app: App) {
  app.event('message', async ({ event, logger, say }) => {
    try {
      let message: any;
      switch (event.subtype) {
        case 'file_share':
        case undefined: {
          message = event;
          break;
        }
        case 'message_changed': {
          message = event.message;
          const previousMessage: any = event.previous_message;
          // ignore when delete a message of a thread, which is also fire a message_changed event
          if (message.text === previousMessage.text) return;
          break;
        }
        default:
          return;
      }

      const regexp = /(^|\s)(off|nghỉ)([?!.,]|$|\s(?!sớm))/gi;
      if (!regexp.test(message.text)) return;

      const accessToken = await getAccessTokenFromServiceAccount();

      const translationResponse = await fetch(
        `https://translation.googleapis.com/v3/projects/${serviceAccountKey.project_id}:translateText`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${accessToken}` },
          body: JSON.stringify({
            sourceLanguageCode: 'vi',
            targetLanguageCode: 'en',
            contents: message.text
              ?.replaceAll(/t2|thứ 2/gi, 'monday')
              ?.replaceAll(/t3|thứ 3/gi, 'tuesday')
              ?.replaceAll(/t4|thứ 4/gi, 'wednesdays')
              ?.replaceAll(/t5|thứ 5/gi, 'thursday')
              ?.replaceAll(/t6|thứ 6/gi, 'friday')
              ?.replaceAll(/nghỉ/gi, 'off')
              ?.replaceAll(/\//g, ' tháng ')
              ?.replaceAll(/-/g, ' đến '),
            mimeType: 'text/plain',
          }),
        },
      );
      const translationObject = await translationResponse.json();
      const translatedText = translationObject.translations[0].translatedText;
      logger.info('translatedText', translatedText);

      const quote = message.text
        .split('\n')
        .map((text: string) => `>${text}`)
        .join('\n');

      const ranges = chrono.parse(translatedText);

      const today = new Date();
      const map = new Map();
      ranges.map(async (range) => {
        const startDate = range.start.date();
        const endDate = range.end ? range.end.date() : startDate;

        logger.info('startDate', startDate.toLocaleString());
        logger.info('endDate', endDate.toLocaleString());

        // ignore duplicated range
        const hash =
          startDate.toDateString() +
          startDate.getHours() +
          endDate.toDateString() +
          endDate.getHours();
        if (map.has(hash)) return;
        map.set(hash, true);

        if (!startDate) return;
        if (new Date(new Date(startDate).setHours(15, 0, 0, 0)) < today) {
          return;
        }
        if (endDate < startDate) return;
        if (isWeekendInRange(startDate, endDate)) {
          const failureText = `${quote}\nNot allow weekend!`;
          await say({
            thread_ts: message.ts,
            blocks: [
              {
                type: 'section',
                text: {
                  type: 'mrkdwn',
                  text: failureText,
                  verbatim: true,
                },
              },
            ],
            text: failureText,
          });
          return;
        }
        if (startDate > addMonths(today, 3)) {
          const failureText = 'No more than 3 months from now!';
          await say({
            thread_ts: message.ts,
            blocks: [
              {
                type: 'section',
                text: {
                  type: 'mrkdwn',
                  text: `${quote}\n${failureText}`,
                  verbatim: true,
                },
              },
            ],
            text: failureText,
          });
          return;
        }

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

        const startDateString = format(startDate, 'yyyy-MM-dd');
        const endDateString = format(endDate, 'yyyy-MM-dd');
        const isSingleMode = startDateString === endDateString;
        if (!isSingleMode && dayPart !== DayPart.ALL) return;

        const timeText = generateTimeText(startDate, endDate, dayPart);
        const text = `<@${message.user}>, are you going to be absent *${timeText}*?`;
        const absencePayload: AbsencePayload = {
          targetUserId: message.user,
          startDateString,
          endDateString,
          dayPart,
          messageText: message.text,
        };

        await say({
          thread_ts: message.ts,
          blocks: [
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: `${quote}\n${text}`,
                verbatim: true,
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
                  value: JSON.stringify(absencePayload),
                  confirm: {
                    title: {
                      type: 'plain_text',
                      text: 'Absence confirm',
                      emoji: true,
                    },
                    text: {
                      type: 'mrkdwn',
                      text: `Do you confirm to be absent ${timeText}?\n The submission will take some time, please be patient.`,
                      verbatim: true,
                    },
                    confirm: {
                      type: 'plain_text',
                      text: 'Confirm',
                      emoji: true,
                    },
                  },
                },
                {
                  type: 'button',
                  action_id: 'absence-new',
                  text: {
                    type: 'plain_text',
                    emoji: true,
                    text: 'No, submit myself',
                  },
                  value: JSON.stringify(absencePayload),
                },
              ],
            },
          ],
          text,
        });
      });
    } catch (error) {
      if (error instanceof Error) {
        logger.error(error.message);
      }
    }
  });
}
