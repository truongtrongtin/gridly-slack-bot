import { App } from '@slack/bolt';
import axios from 'axios';
import { endOfYear, startOfDay } from 'date-fns';
import appHomeView from '../../user-interface/app-home';

export default function appHomeRefresh(app: App) {
  app.action(
    { type: 'block_actions', action_id: 'app-home-refresh' },
    async ({ ack, body, client, logger }) => {
      await ack();

      try {
        // Get slack user info
        const userInfo = await client.users.info({ user: body.user.id });
        const email = userInfo.user?.profile?.email;
        const firstName = userInfo.user?.profile?.first_name;
        logger.info(`${firstName} is refreshing app home`);

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
          timeMin: startOfDay(new Date()).toISOString(),
          timeMax: endOfYear(new Date()).toISOString(),
          q: email!,
          orderBy: 'updated',
        }).toString();
        const eventListResponse = await axios.get(
          `https://www.googleapis.com/calendar/v3/calendars/${process.env.GOOGLE_CALENDAR_ID}/events?${queryParams}`,
          { headers: { Authorization: `Bearer ${accessToken}` } },
        );
        const absenceEvents = eventListResponse.data.items;

        // Update app home
        await client.views.update({
          view_id: body.view?.id,
          view: appHomeView(absenceEvents, firstName!),
        });
      } catch (error) {
        logger.error(error);
      }
    },
  );
}
