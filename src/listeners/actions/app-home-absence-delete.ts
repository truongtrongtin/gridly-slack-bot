import { App } from '@slack/bolt';
import { addMonths, startOfDay } from 'date-fns';
import fetch from 'node-fetch';
import { CalendarEvent } from '../../types';
import appHomeView from '../../user-interface/app-home';

export default function appHomeAbsenceDelete(app: App) {
  app.action(
    { type: 'block_actions', action_id: 'app-home-absence-delete' },
    async ({ ack, body, client, logger }) => {
      // Acknowledge the button request
      await ack();

      const eventId = body.actions[0].block_id;

      try {
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

        // Get absence event from google calendar
        const eventResponse = await fetch(
          `https://www.googleapis.com/calendar/v3/calendars/${process.env.GOOGLE_CALENDAR_ID}/events/${eventId}`,
          { headers: { Authorization: `Bearer ${accessToken}` } },
        );
        const eventObject = await eventResponse.json();
        const startDate = eventObject.start.date;
        const message_ts: string =
          eventObject?.extendedProperties?.private?.message_ts || '';
        if (!message_ts) return;
        if (
          new Date(startDate).setHours(0, 0, 0, 0) <
          new Date().setHours(0, 0, 0, 0)
        ) {
          return;
        }

        // Delete absence event from google calendar
        await fetch(
          `https://www.googleapis.com/calendar/v3/calendars/${process.env.GOOGLE_CALENDAR_ID}/events/${eventId}`,
          {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${accessToken}` },
          },
        );

        const userInfo = await client.users.info({ user: body.user.id });
        const realName = userInfo.user?.profile?.real_name;
        logger.info(`${realName} is deleting absence`);

        // Delete announced message
        await client.chat.delete({
          channel: process.env.SLACK_CHANNEL!,
          ts: message_ts,
        });

        // Get events from google calendar
        const queryParams = new URLSearchParams({
          timeMin: startOfDay(new Date()).toISOString(),
          timeMax: addMonths(new Date(), 3).toISOString(),
          q: 'off',
          orderBy: 'startTime',
          singleEvents: 'true',
          maxResults: '2500',
        });
        const eventListResponse = await fetch(
          `https://www.googleapis.com/calendar/v3/calendars/${process.env.GOOGLE_CALENDAR_ID}/events?${queryParams}`,
          { headers: { Authorization: `Bearer ${accessToken}` } },
        );
        const eventListObject = await eventListResponse.json();
        const absenceEvents: CalendarEvent[] = eventListObject.items || [];

        // Update app home
        await client.views.update({
          view_id: body.view?.id,
          view: appHomeView(absenceEvents, userInfo.user),
        });
      } catch (error) {
        if (error instanceof Error) {
          logger.error(error.message);
        }
      }
    },
  );
}
