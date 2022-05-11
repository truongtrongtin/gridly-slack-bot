import { App } from '@slack/bolt';
import axios from 'axios';
import {
  addDays,
  addMonths,
  endOfDay,
  endOfYear,
  format,
  isBefore,
  isSameDay,
  startOfDay,
} from 'date-fns';
import { capitalize, generateTimeText } from '../../helpers';
import members from '../../member-list.json';
import { DayPart } from '../../types';
import appHomeView from '../../user-interface/app-home';

export default function newAbsenceSubmit(app: App) {
  app.view(
    'new-absence-submit',
    async ({ ack, body, view, client, logger }) => {
      const startDate =
        view['state']['values']['start-date-block']['start-date-action']
          .selected_date;

      if (!startDate) {
        await ack({
          response_action: 'errors',
          errors: {
            'start-date-block': 'Start date is required',
          },
        });
        return;
      }

      const endDate =
        view['state']['values']['end-date-block']['end-date-action']
          .selected_date || startDate;
      const dayPart = view['state']['values']['day-part-block'][
        'day-part-action'
      ].selected_option?.value as DayPart;
      const reason =
        view['state']['values']['reason-block']['reason-action'].value || '';

      if (
        new Date(startDate).setHours(0, 0, 0, 0) <
        new Date().setHours(0, 0, 0, 0)
      ) {
        await ack({
          response_action: 'errors',
          errors: {
            'start-date-block': 'Not allow date in the past',
          },
        });
        return;
      }

      if (
        new Date(startDate).setHours(0, 0, 0, 0) >
        addMonths(new Date(), 1).setHours(0, 0, 0, 0)
      ) {
        await ack({
          response_action: 'errors',
          errors: {
            'start-date-block': 'Must not be later than 1 month from now',
          },
        });
        return;
      }

      if (
        new Date(endDate).setHours(0, 0, 0, 0) >
        addMonths(new Date(), 1).setHours(0, 0, 0, 0)
      ) {
        await ack({
          response_action: 'errors',
          errors: {
            'end-date-block': 'Must not be later than 1 month from now',
          },
        });
        return;
      }

      if (isBefore(new Date(endDate), new Date(startDate))) {
        await ack({
          response_action: 'errors',
          errors: {
            'end-date-block': 'Must not be smaller than start date',
          },
        });
        return;
      }

      const isSingleMode = isSameDay(new Date(startDate), new Date(endDate));
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
        const user = body['user']['id'];
        // Get slack message 's author info
        const userInfo = await client.users.info({ user });
        const email = userInfo?.user?.profile?.email;
        const firstName = userInfo?.user?.profile?.first_name;
        logger.info(`${firstName} is submiting absence`);

        const foundMember = members.find((member) => member.email === email);
        const memberName = foundMember
          ? capitalize(foundMember.possibleNames[0])
          : '';
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
          timeMin: startOfDay(new Date(startDate)).toISOString(),
          timeMax: endOfDay(new Date(endDate)).toISOString(),
          q: email!,
        }).toString();
        const eventListResponse = await axios.get(
          `https://www.googleapis.com/calendar/v3/calendars/${process.env.GOOGLE_CALENDAR_ID}/events?${queryParams}`,
          { headers: { Authorization: `Bearer ${accessToken}` } },
        );
        const absenceEvents = eventListResponse.data?.items;

        const timeText = generateTimeText(
          new Date(startDate),
          new Date(endDate),
          dayPart,
        );
        // If has absence, send ephemeral error message to user
        if (absenceEvents.length) {
          const failureText = `:x: Failed to create. You already have absence on`;
          await client.chat.postEphemeral({
            channel: process.env.SLACK_CHANNEL!,
            user,
            text: `${failureText} *${timeText}*.`,
          });
          return;
        }
        const reasonText = reason ? ` Reason: ${reason}` : '';

        const newMessage = await client.chat.postMessage({
          channel: process.env.SLACK_CHANNEL!,
          text: `<@${user}> will be absent on *${timeText}*.${reasonText}`,
        });
        console.log(JSON.stringify(newMessage, null, 2));

        // Create new event on google calendar
        await axios.post(
          `https://www.googleapis.com/calendar/v3/calendars/${process.env.GOOGLE_CALENDAR_ID}/events`,
          {
            start: {
              date: startDate,
            },
            end: {
              date: format(addDays(new Date(endDate), 1), 'yyyy-MM-dd'),
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

        const newQueryParams = new URLSearchParams({
          timeMin: startOfDay(new Date()).toISOString(),
          timeMax: endOfYear(new Date()).toISOString(),
          q: email!,
        }).toString();
        const newEventListResponse = await axios.get(
          `https://www.googleapis.com/calendar/v3/calendars/${process.env.GOOGLE_CALENDAR_ID}/events?${newQueryParams}`,
          { headers: { Authorization: `Bearer ${accessToken}` } },
        );
        const newAbsenceEvents = newEventListResponse.data?.items;

        // Update app home
        await client.views.publish({
          user_id: user,
          view: appHomeView(newAbsenceEvents, firstName!),
        });
      } catch (error) {
        logger.error(error);
      }
    },
  );
}
