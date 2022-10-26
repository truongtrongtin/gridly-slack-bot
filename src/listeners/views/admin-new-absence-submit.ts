import { App } from '@slack/bolt';
import { addDays, addMonths, format, startOfDay } from 'date-fns';
import fetch from 'node-fetch';
import { generateTimeText, isWeekendInRange } from '../../helpers';
import members from '../../member-list.json';
import { CalendarEvent, DayPart } from '../../types';
import appHomeView from '../../user-interface/app-home';

export default function adminNewAbsenceSubmit(app: App) {
  app.view(
    'admin-new-absence-submit',
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

      const memberId =
        view['state']['values']['member_block']['member-action'].selected_user;

      if (!memberId) {
        await ack({
          response_action: 'errors',
          errors: {
            member_block: 'Member is required',
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
        // Get slack user and member info
        const [user, member] = await Promise.all(
          [userId, memberId].map(async (id: string) => {
            const useInfoResponse = await client.users.info({ user: id });
            return useInfoResponse.user;
          }),
        );
        const userRealName = user?.profile?.real_name;
        const memberRealName = member?.profile?.real_name;
        const memberEmail = member?.profile?.email;

        if (userId === memberId) {
          logger.info(`${userRealName} is submiting absence`);
        } else {
          logger.info(
            `admin ${userRealName} is submiting absence for ${memberRealName}`,
          );
        }

        const foundMember = members.find(
          (member) => member.email === memberEmail,
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
            user: userId,
            text: `${failureText} *${timeText}*.`,
          });
          return;
        }
        const reasonText = reason ? ` Reason: ${reason}` : '';

        const newMessage = await client.chat.postMessage({
          channel: process.env.SLACK_CHANNEL!,
          text: `<@${memberId}> will be absent on *${timeText}*.${reasonText}`,
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
                  email: memberEmail,
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

        const newQueryParams = new URLSearchParams({
          timeMin: today.toISOString(),
          timeMax: addMonths(new Date(), 3).toISOString(),
          q: 'off',
          orderBy: 'startTime',
          singleEvents: 'true',
          maxResults: '2500',
        });
        const newEventListResponse = await fetch(
          `https://www.googleapis.com/calendar/v3/calendars/${process.env.GOOGLE_CALENDAR_ID}/events?${newQueryParams}`,
          { headers: { Authorization: `Bearer ${accessToken}` } },
        );
        const newEventListObject = await newEventListResponse.json();
        const newAbsenceEvents = newEventListObject.items || [];

        // Update app home
        await client.views.publish({
          user_id: userId,
          view: appHomeView(newAbsenceEvents, user!),
        });
      } catch (error) {
        if (error instanceof Error) {
          logger.error(error.message);
        }
      }
    },
  );
}
