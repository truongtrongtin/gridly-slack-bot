import { App, ButtonAction } from '@slack/bolt';
import { addDays, format } from 'date-fns';
import fetch from 'node-fetch';
import { generateTimeText, hasAdminRole } from '../../helpers';
import members from '../../member-list.json';
import { CalendarEvent, DayPart } from '../../types';

export default function absenceSuggestionYes(app: App) {
  app.action(
    { type: 'block_actions', action_id: 'absence-suggestion-yes' },

    async ({ ack, say, payload, body, client, logger }) => {
      // console.log('body', JSON.stringify(body, null, 2));
      const { startDateString, endDateString, dayPart, reason, authorId } =
        JSON.parse((<ButtonAction>payload).value);
      const isSingleMode = startDateString === endDateString;
      const startDate = new Date(startDateString);
      const endDate = new Date(endDateString);

      await ack();

      try {
        const actionUserId = body.user.id;
        const [authorEmail, actionUserEmail] = await Promise.all(
          [authorId, actionUserId].map(async (userId) => {
            const userInfo = await client.users.info({ user: userId });
            return userInfo?.user?.profile?.email;
          }),
        );

        if (authorId !== actionUserId && !hasAdminRole(actionUserEmail)) {
          await client.chat.postEphemeral({
            channel: process.env.SLACK_CHANNEL!,
            user: body.user.id,
            text: ':x: You are not authorized to perform this action!',
          });
          return;
        }

        const foundMember = members.find(
          (member) => member.email === authorEmail,
        );
        if (!foundMember) throw Error('member not found');
        const memberName = foundMember.names[0];

        const dayPartText =
          dayPart === DayPart.ALL ? '(off)' : `(off ${dayPart})`;
        const summary = `${memberName} ${dayPartText}`;

        // Get new google access token from refresh token
        const tokenResponse = await fetch(
          'https://oauth2.googleapis.com/token',
          {
            method: 'POST',
            body: JSON.stringify({
              client_id: process.env.GOOGLE_CLIENT_ID,
              client_secret: process.env.GOOGLE_CLIENT_SECRET,
              grant_type: 'refresh_token',
              refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
            }),
          },
        );
        const tokenObject = await tokenResponse.json();
        const accessToken: string = tokenObject.access_token;

        // Get events from google calendar
        const queryParams = new URLSearchParams({
          timeMin: startDate.toISOString(),
          timeMax: addDays(endDate, 1).toISOString(),
          q: memberName,
        });
        const eventListResponse = await fetch(
          `https://www.googleapis.com/calendar/v3/calendars/${process.env.GOOGLE_CALENDAR_ID}/events?${queryParams}`,
          { headers: { Authorization: `Bearer ${accessToken}` } },
        );
        const eventListObject = await eventListResponse.json();
        const absenceEvents: CalendarEvent[] = eventListObject.items || [];

        const timeText = generateTimeText(startDate, endDate, dayPart);
        const dayPartExisted = absenceEvents.some((event) =>
          event.summary.includes(dayPart),
        );
        if (
          (isSingleMode && dayPartExisted) ||
          ((!isSingleMode || dayPart === DayPart.ALL) &&
            absenceEvents.length > 0)
        ) {
          const failureText =
            ':x: Failed to create. You already have absence on';
          await client.chat.postEphemeral({
            channel: process.env.SLACK_CHANNEL!,
            user: actionUserId,
            text: `${failureText} *${timeText}*.`,
          });
          return;
        }

        const newMessage = await say({
          channel: process.env.SLACK_CHANNEL!,
          text: `<@${authorId}> will be absent on *${timeText}*.`,
        });

        // Create new event on google calendar
        await fetch(
          `https://www.googleapis.com/calendar/v3/calendars/${process.env.GOOGLE_CALENDAR_ID}/events`,
          {
            method: 'POST',
            headers: { Authorization: `Bearer ${accessToken}` },
            body: JSON.stringify({
              start: {
                date: startDateString,
              },
              end: {
                date: format(addDays(endDate, 1), 'yyyy-MM-dd'),
              },
              summary,
              attendees: [
                {
                  email: authorEmail,
                  responseStatus: 'accepted',
                },
              ],
              sendUpdates: 'all',
              extendedProperties: {
                private: {
                  message_ts: newMessage.message?.ts,
                  ...(reason ? { reason } : {}),
                },
              },
              transparency: 'transparent',
            }),
          },
        );
      } catch (error) {
        if (error instanceof Error) {
          logger.error(error.message);
        }
      }
    },
  );
}
