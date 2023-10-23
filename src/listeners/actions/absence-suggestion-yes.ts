import { App, ButtonAction } from '@slack/bolt';
import { addDays, format } from 'date-fns';
import { findMemberById, generateTimeText } from '../../helpers.js';
import getAccessTokenFromRefreshToken from '../../services/get-access-token-from-refresh-token.js';
import { AbsencePayload, DayPart, Role } from '../../types.js';

export default function absenceSuggestionYes(app: App) {
  app.action(
    { type: 'block_actions', action_id: 'absence-suggestion-yes' },

    async ({ ack, say, payload, body, client, logger }) => {
      await ack();
      const {
        targetUserId,
        startDateString,
        endDateString,
        dayPart,
        messageText,
      }: AbsencePayload = JSON.parse((<ButtonAction>payload).value);

      const startDate = new Date(startDateString);
      const endDate = new Date(endDateString);

      try {
        const actionUserId = body.user.id;
        const actionUser = findMemberById(actionUserId);
        if (!actionUser) throw Error('action user not found');
        const actionUserName = actionUser.name;
        const isAdmin = actionUser.role === Role.ADMIN;

        if (targetUserId !== actionUserId && !isAdmin) {
          await client.chat.postEphemeral({
            channel: process.env.SLACK_CHANNEL,
            user: body.user.id,
            text: ':x: You are not authorized to perform this action!',
          });
          return;
        }

        const targetUser = findMemberById(targetUserId);
        if (!targetUser) throw Error('target user not found');
        const targetUserName = targetUser.name;

        if (!isAdmin && actionUser.id === targetUser.id) {
          logger.info(`${actionUserName} is submiting absence`);
        } else {
          logger.info(
            `admin ${actionUserName} is submiting absence for ${targetUserName}`,
          );
        }

        const accessToken = await getAccessTokenFromRefreshToken();
        const dayPartText =
          dayPart === DayPart.ALL ? '(off)' : `(off ${dayPart})`;
        const summary = `${targetUserName} ${dayPartText}`;
        const timeText = generateTimeText(startDate, endDate, dayPart);

        const newMessage = await say({
          channel: process.env.SLACK_CHANNEL,
          text: `<@${targetUserId}> will be absent *${timeText}*.`,
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
                  email: targetUser.email,
                  responseStatus: 'accepted',
                },
              ],
              sendUpdates: 'all',
              extendedProperties: {
                private: {
                  message_ts: newMessage.message?.ts,
                  ...(messageText ? { reason: messageText } : {}),
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
