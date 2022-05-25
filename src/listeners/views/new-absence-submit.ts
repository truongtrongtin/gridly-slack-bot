import { App } from '@slack/bolt';
import axios from 'axios';
import { addDays, addMonths, format, startOfDay } from 'date-fns';
import { generateTimeText, isWeekendInRange } from '../../helpers';
import members from '../../member-list.json';
import { DayPart } from '../../types';

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
        const userInfo = await client.users.info({ user: userId });
        const email = userInfo?.user?.profile?.email;
        const realName = userInfo?.user?.profile?.real_name;
        logger.info(`${realName} is submiting absence`);

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
        const reasonText = reason ? ` Reason: ${reason}` : '';

        const newMessage = await client.chat.postMessage({
          channel: process.env.SLACK_CHANNEL!,
          text: `<@${userId}> will be absent on *${timeText}*.${reasonText}`,
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
