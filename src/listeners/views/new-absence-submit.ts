import { App } from '@slack/bolt';
import { addDays, addMonths, format, startOfDay } from 'date-fns';
import {
  findMemberById,
  generateTimeText,
  isWeekendInRange,
} from '../../helpers';
import getAccessTokenFromRefreshToken from '../../services/get-access-token-from-refresh-token';
import { DayPart, Role } from '../../types';

export default function newAbsenceSubmit(app: App) {
  app.view(
    'new-absence-submit',
    async ({ ack, body, view, client, logger }) => {
      const startDateString =
        view.state.values['start-date-block']['start-date-action']
          .selected_date;

      if (!startDateString) {
        await ack({
          response_action: 'errors',
          errors: {
            'start-date-block': 'Start date is required',
          },
        });
        return;
      }

      const endDateString =
        view.state.values['end-date-block']['end-date-action'].selected_date ||
        startDateString;
      const dayPart = view.state.values['day-part-block']['day-part-action']
        .selected_option?.value as DayPart;
      const reason =
        view.state.values['reason-block']['reason-action'].value || '';

      const isSingleMode = startDateString === endDateString;
      const startDate = new Date(startDateString);
      const endDate = new Date(endDateString);
      const today = startOfDay(new Date());

      const actionUserId = body.user.id;
      const actionUser = findMemberById(actionUserId);
      if (!actionUser) throw Error('action user not found');
      const actionUserName = actionUser.name;
      const isAdmin = actionUser.role === Role.ADMIN;

      const targetUserId =
        view.state.values?.['member-block']?.['member-action']?.selected_user;

      let targetUser = actionUser;
      if (isAdmin) {
        if (!targetUserId) {
          await ack({
            response_action: 'errors',
            errors: {
              member_block: 'Member is required',
            },
          });
          return;
        }
        const foundUser = findMemberById(targetUserId);
        if (!foundUser) throw Error('target user not found');
        targetUser = foundUser;
      }
      const targetUserName = targetUser.name;
      if (!isAdmin && actionUser.id === targetUser.id) {
        logger.info(`${actionUserName} is submiting absence`);
      } else {
        logger.info(
          `admin ${actionUserName} is submiting absence for ${targetUserName}`,
        );
      }

      if (!isAdmin && startDate < today) {
        await ack({
          response_action: 'errors',
          errors: {
            'start-date-block': 'Not allow day in the past',
          },
        });
        return;
      }

      if (isWeekendInRange(startDate, endDate)) {
        if (isSingleMode) {
          await ack({
            response_action: 'errors',
            errors: {
              'start-date-block': 'Not allow weekend',
            },
          });
        } else {
          await ack({
            response_action: 'errors',
            errors: {
              'start-date-block': 'Not allow weekend in range',
              'end-date-block': 'Not allow weekend in range',
            },
          });
        }
        return;
      }

      if (endDate < startDate) {
        await ack({
          response_action: 'errors',
          errors: {
            'end-date-block': 'Must not be earlier than start date',
          },
        });
        return;
      }

      if (startDate > addMonths(today, 3)) {
        await ack({
          response_action: 'errors',
          errors: {
            'start-date-block': 'Must not be later than 3 months from now',
          },
        });
        return;
      }

      if (endDate > addMonths(today, 3)) {
        await ack({
          response_action: 'errors',
          errors: {
            'end-date-block': 'Must not be later than 3 months from now',
          },
        });
        return;
      }

      if (!isSingleMode && dayPart !== DayPart.ALL) {
        await ack({
          response_action: 'errors',
          errors: {
            'day-part-block': 'This option is not supported in multi-date mode',
          },
        });
        return;
      }

      await ack();

      try {
        const accessToken = await getAccessTokenFromRefreshToken();
        const dayPartText =
          dayPart === DayPart.ALL ? '(off)' : `(off ${dayPart})`;
        const summary = `${targetUserName} ${dayPartText}`;
        const timeText = generateTimeText(startDate, endDate, dayPart);
        const reasonText = reason ? ` Reason: ${reason}` : '';

        const newMessage = await client.chat.postMessage({
          channel: process.env.SLACK_CHANNEL!,
          text: `<@${targetUser.id}> will be absent *${timeText}*.${reasonText}`,
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
