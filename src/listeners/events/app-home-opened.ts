import { App } from '@slack/bolt';
import { startOfDay } from 'date-fns';
import { findMemberById } from '../../helpers.js';
import getAccessTokenFromRefreshToken from '../../services/get-access-token-from-refresh-token.js';
import { CalendarEvent } from '../../types.js';
import appHomeView from '../../user-interface/app-home.js';

export default function appHomeOpened(app: App) {
  // Listen for users opening your App Home
  app.event('app_home_opened', async ({ event, client, logger }) => {
    try {
      const foundMember = findMemberById(event.user);
      if (!foundMember) throw Error('member not found');
      logger.info(`${foundMember.name} is opening app home`);

      const accessToken = await getAccessTokenFromRefreshToken();

      // Get future absences from google calendar
      const queryParams = new URLSearchParams({
        timeMin: startOfDay(new Date()).toISOString(),
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

      await client.views.publish({
        user_id: event.user,
        view: appHomeView(absenceEvents, event.user),
      });
    } catch (error) {
      if (error instanceof Error) {
        logger.error(error.message);
      }
    }
  });
}
