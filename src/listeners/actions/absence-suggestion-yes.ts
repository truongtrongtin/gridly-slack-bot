import { App, ButtonAction } from '@slack/bolt';
import axios from 'axios';
import { addDays, format, startOfDay } from 'date-fns';
import { generateTimeText } from '../../helpers';
import members from '../../member-list.json';
import { DayPart } from '../../types';

export default function absenceSuggestionYes(app: App) {
  app.action(
    { type: 'block_actions', action_id: 'absence-suggestion-yes' },

    async ({ ack, say, payload, body, client, logger }) => {
      // console.log('body', JSON.stringify(body, null, 2));
      const { startDateString, endDateString, dayPart, reason, authorId } =
        JSON.parse((<ButtonAction>payload).value);
      const startDate = new Date(startDateString);
      const endDate = new Date(endDateString);
      const today = startOfDay(new Date());
      if (startDate < today) return;

      await ack();

      try {
        const userId = body.user.id;
        if (authorId !== userId) return;

        const userInfo = await client.users.info({ user: userId });
        const email = userInfo?.user?.profile?.email;
        const realName = userInfo?.user?.profile?.real_name;
        logger.info(`${realName} is approving absence suggestion`);

        const foundMember = members.find((member) => member.email === email);
        if (!foundMember) throw Error('member not found');
        const memberName = foundMember.possibleNames[0];

        const dayPartText =
          dayPart === DayPart.ALL ? '(off)' : `(off ${dayPart})`;

        // Get new google access token from refresh token
        const tokenResponse = await axios.post(
          'https://oauth2.googleapis.com/token',
          {
            client_id: process.env.GOOGLE_CLIENT_ID,
            client_secret: process.env.GOOGLE_CLIENT_SECRET,
            grant_type: 'refresh_token',
            refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
          },
        );
        const accessToken: string = tokenResponse.data.access_token;

        // Get events from google calendar
        const queryParams = new URLSearchParams({
          timeMin: startDate.toISOString(),
          timeMax: addDays(endDate, 1).toISOString(),
          q: email!,
        }).toString();
        const eventListResponse = await axios.get(
          `https://www.googleapis.com/calendar/v3/calendars/${process.env.GOOGLE_CALENDAR_ID}/events?${queryParams}`,
          { headers: { Authorization: `Bearer ${accessToken}` } },
        );
        const absenceEvents = eventListResponse.data?.items;

        const timeText = generateTimeText(startDate, endDate, dayPart);
        // If has absence, send ephemeral error message to user
        if (absenceEvents.length) {
          const failureText = `:x: Failed to create. You already have absence on`;
          await client.chat.postEphemeral({
            channel: process.env.SLACK_CHANNEL!,
            user: userId,
            text: `${failureText} *${timeText}*.`,
          });
          return;
        }

        const newMessage = await say({
          channel: process.env.SLACK_CHANNEL!,
          text: `<@${userId}> will be absent on *${timeText}*.`,
        });

        // Create new event on google calendar
        await axios.post(
          `https://www.googleapis.com/calendar/v3/calendars/${process.env.GOOGLE_CALENDAR_ID}/events`,
          {
            start: {
              date: startDateString,
            },
            end: {
              date: format(addDays(endDate, 1), 'yyyy-MM-dd'),
            },
            summary: `${memberName || email} ${dayPartText}`,
            description: JSON.stringify({
              message_ts: newMessage.message?.ts,
              reason,
            }),
            attendees: [
              {
                email,
                responseStatus: 'accepted',
              },
            ],
            sendUpdates: 'all',
          },
          { headers: { Authorization: `Bearer ${accessToken}` } },
        );
      } catch (error) {
        logger.error(error);
      }
    },
  );
}
