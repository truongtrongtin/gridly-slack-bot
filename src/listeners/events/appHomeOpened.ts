import { AllMiddlewareArgs, SlackEventMiddlewareArgs } from '@slack/bolt';
import { startOfDay } from 'date-fns';
import { findMemberById } from '../../helpers.js';
import { getAccessTokenFromRefreshToken } from '../../services/getAccessTokenFromRefreshToken.js';
import { CalendarEvent } from '../../types.js';
import { appHomeView } from '../../user-interface/appHomeView.js';

export async function appHomeOpened({
  event,
  client,
  logger,
}: AllMiddlewareArgs & SlackEventMiddlewareArgs<'app_home_opened'>) {
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
}
