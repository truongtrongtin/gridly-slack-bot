import { App } from '@slack/bolt';
import { addDays, addMonths, endOfDay, format, startOfDay } from 'date-fns';
import {
  findMemberById,
  generateTimeText,
  isWeekendInRange,
} from '../../helpers';
import getAccessTokenFromRefresh from '../../services/get-access-token-from-refresh-token';
import { CalendarEvent, DayPart } from '../../types';

export default function newAbsenceSubmit(app: App) {
  app.view(
    'new-absence-submit',
    async ({ ack, body, view, client, logger }) => {
      const startDateString =
        view['state']['values']['start-date-block']['start-date-action']
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
        view['state']['values']['end-date-block']['end-date-action']
          .selected_date || startDateString;
      const dayPart = view['state']['values']['day-part-block'][
        'day-part-action'
      ].selected_option?.value as DayPart;
      const reason =
        view['state']['values']['reason-block']['reason-action'].value || '';

      const isSingleMode = startDateString === endDateString;
      const startDate = new Date(startDateString);
      const endDate = new Date(endDateString);
      const today = startOfDay(new Date());
      const userId = body['user']['id'];

      if (startDate < today) {
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
        // Get slack message 's author info
        const foundMember = findMemberById(userId);
        if (!foundMember) throw Error('member not found');
        const memberName = foundMember.names[0];
        logger.info(`${memberName} is submiting absence`);

        const dayPartText =
          dayPart === DayPart.ALL ? '(off)' : `(off ${dayPart})`;
        const summary = `${memberName} ${dayPartText}`;

        const accessToken = await getAccessTokenFromRefresh();

        // Get events from google calendar
        const queryParams = new URLSearchParams({
          timeMin: startDate.toISOString(),
          timeMax: endOfDay(endDate).toISOString(),
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
          const failureText = ':x: Failed to create. You already have absence';
          await client.chat.postEphemeral({
            channel: process.env.SLACK_CHANNEL!,
            user: userId,
            text: `${failureText} *${timeText}*.`,
          });
          return;
        }
        const reasonText = reason ? ` Reason: ${reason}` : '';

        const newMessage = await client.chat.postMessage({
          channel: process.env.SLACK_CHANNEL!,
          text: `<@${userId}> will be absent *${timeText}*.${reasonText}`,
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
                  email: foundMember.email,
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
