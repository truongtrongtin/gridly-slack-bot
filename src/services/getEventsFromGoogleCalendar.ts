import { CalendarEvent } from '../types.js';
import { getAccessTokenFromRefreshToken } from './getAccessTokenFromRefreshToken.js';

export async function getEventsFromGoogleCalendar(query: URLSearchParams) {
  const accessToken = await getAccessTokenFromRefreshToken();
  let events: CalendarEvent[] = [];
  do {
    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${process.env.GOOGLE_CALENDAR_ID}/events?${query}`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    const data = await response.json();
    if (!response.ok) throw data;
    events = events.concat(data.items);
    if (data.nextPageToken) {
      query.set('pageToken', data.nextPageToken);
    }
  } while (query.get('pageToken'));
  return events;
}
