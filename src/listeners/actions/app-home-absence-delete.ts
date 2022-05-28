import { App } from '@slack/bolt';
import axios from 'axios';
import { addMonths, startOfDay } from 'date-fns';
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

        // Get absence event from google calendar
        const eventResponse = await axios.get(
          `https://www.googleapis.com/calendar/v3/calendars/${process.env.GOOGLE_CALENDAR_ID}/events/${eventId}`,
          { headers: { Authorization: `Bearer ${accessToken}` } },
        );

        const startDate = eventResponse.data.start.date;
        const message_ts = JSON.parse(
          eventResponse.data.description,
        ).message_ts;
        if (
          new Date(startDate).setHours(0, 0, 0, 0) <
          new Date().setHours(0, 0, 0, 0)
        ) {
          return;
        }

        // Delete absence event from google calendar
        await axios.delete(
          `https://www.googleapis.com/calendar/v3/calendars/${process.env.GOOGLE_CALENDAR_ID}/events/${eventId}`,
          { headers: { Authorization: `Bearer ${accessToken}` } },
        );

        const userInfo = await client.users.info({ user: body.user.id });
        const realName = userInfo.user?.profile?.real_name;
        logger.info(`${realName} is deleting absence`);

        // Get events from google calendar
        const queryParams = new URLSearchParams({
          timeMin: startOfDay(new Date()).toISOString(),
          timeMax: addMonths(new Date(), 3).toISOString(),
        }).toString();
        const eventListResponse = await axios.get(
          `https://www.googleapis.com/calendar/v3/calendars/${process.env.GOOGLE_CALENDAR_ID}/events?${queryParams}`,
          { headers: { Authorization: `Bearer ${accessToken}` } },
        );
        const absenceEvents = eventListResponse.data.items;

        // Delete announced message
        await client.chat.delete({
          channel: process.env.SLACK_CHANNEL!,
          ts: message_ts,
        });

        // Update app home
        await client.views.update({
          view_id: body.view?.id,
          view: appHomeView(absenceEvents, userInfo.user),
        });
      } catch (error) {
        logger.error(error);
      }
    },
  );
}
