import { App } from '@slack/bolt';
import { addMonths, startOfDay } from 'date-fns';
import fetch from 'node-fetch';
import appHomeView from '../../user-interface/app-home';

export default function appHomeOpened(app: App) {
  // Listen for users opening your App Home
  app.event('app_home_opened', async ({ event, client, logger }) => {
    try {
      const userInfo = await client.users.info({ user: event.user });
      const realName = userInfo.user?.profile?.real_name;
      logger.info(`${realName} is opening app home`);

      // Get new google access token from refresh token
      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        body: JSON.stringify({
          client_id: process.env.GOOGLE_CLIENT_ID,
          client_secret: process.env.GOOGLE_CLIENT_SECRET,
          grant_type: 'refresh_token',
          refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
        }),
      });
      const tokenObject = await tokenResponse.json();
      const accessToken: string = tokenObject.access_token;

      // Get future absences from google calendar
      const queryParams = new URLSearchParams({
        timeMin: startOfDay(new Date()).toISOString(),
        timeMax: addMonths(new Date(), 3).toISOString(),
        q: 'off',
      });
      const eventListResponse = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${process.env.GOOGLE_CALENDAR_ID}/events?${queryParams}`,
        { headers: { Authorization: `Bearer ${accessToken}` } },
      );
      const eventListObject = await eventListResponse.json();
      const absenceEvents = eventListObject.items;

      await client.views.publish({
        user_id: event.user,
        view: appHomeView(absenceEvents, userInfo.user),
      });
    } catch (error) {
      if (error instanceof Error) {
        logger.error(error.message);
      }
    }
  });
}
