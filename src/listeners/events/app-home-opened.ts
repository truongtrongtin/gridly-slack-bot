import { App } from '@slack/bolt';
import axios from 'axios';
import { endOfYear, startOfDay } from 'date-fns';
import appHomeView from '../../user-interface/app-home';

export default function appHomeOpened(app: App) {
  // Listen for users opening your App Home
  app.event('app_home_opened', async ({ event, client, logger }) => {
    try {
      const userInfo = await client.users.info({ user: event.user });
      const email = userInfo.user?.profile?.email;
      const realName = userInfo.user?.profile?.real_name;
      logger.info(`${realName} is opening app home`);

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
      }).toString();
      const eventListResponse = await axios.get(
        `https://www.googleapis.com/calendar/v3/calendars/${process.env.GOOGLE_CALENDAR_ID}/events?${queryParams}`,
        { headers: { Authorization: `Bearer ${accessToken}` } },
      );
      const absenceEvents = eventListResponse.data.items;

      // Call views.publish with the built-in client
      await client.views.publish({
        // Use the user ID associated with the event
        user_id: event.user,
        view: appHomeView(absenceEvents),
      });
    } catch (error) {
      logger.error(error);
    }
  });
}
