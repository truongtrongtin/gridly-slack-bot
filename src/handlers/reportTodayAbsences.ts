import { startOfToday, startOfTomorrow } from 'date-fns';
import { Request, Response } from 'express';
import {
  getDayPartFromEventSummary,
  getMemberNameFromEventSummary,
} from '../helpers.js';
import { slackApp } from '../main.js';
import { getAccessTokenFromRefreshToken } from '../services/getAccessTokenFromRefreshToken.js';
import { CalendarEvent } from '../types.js';

export async function reportTodayAbsences(req: Request, res: Response) {
  try {
    // verify token from Google Cloud Scheduler
    if (process.env.K_SERVICE) {
      const token = req.headers.authorization?.split('Bearer ')[1];
      const tokenInfoResponse = await fetch(
        `https://oauth2.googleapis.com/tokeninfo?id_token=${token}`,
      );
      const tokenInfo = await tokenInfoResponse.json();
      if (!tokenInfoResponse.ok) {
        return res.status(tokenInfoResponse.status).send(tokenInfo);
      }
    }

    const accessToken = await getAccessTokenFromRefreshToken();

    // If today is public holiday, return immediately
    const publicHolidaysQueryParams = new URLSearchParams({
      timeMin: startOfToday().toISOString(),
      timeMax: startOfTomorrow().toISOString(),
      q: 'Public holiday',
    });
    const calendarId = encodeURIComponent(
      'en.vietnamese#holiday@group.v.calendar.google.com',
    );
    const publicHolidaysResponse = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events?${publicHolidaysQueryParams}`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    const publicHolidaysData = await publicHolidaysResponse.json();
    if (publicHolidaysData.items.length > 0) {
      return res.end();
    }

    const queryParams = new URLSearchParams({
      timeMin: startOfToday().toISOString(),
      timeMax: startOfTomorrow().toISOString(),
      q: 'off',
      maxResults: '2500',
    });
    const eventListResponse = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${process.env.GOOGLE_CALENDAR_ID}/events?${queryParams}`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    const eventListObject = await eventListResponse.json();
    const absenceEvents: CalendarEvent[] = eventListObject.items;

    await slackApp.client.chat.postMessage({
      channel: process.env.SLACK_CHANNEL,
      text:
        absenceEvents.length > 0
          ? `${absenceEvents.length} absences today!`
          : 'No absences today!',
      blocks: [
        {
          type: 'rich_text',
          elements: [
            {
              type: 'rich_text_section',
              elements: [
                {
                  type: 'text',
                  text:
                    absenceEvents.length > 0
                      ? "Today's planned absences:"
                      : 'No planned absences today!',
                },
              ],
            },
            {
              type: 'rich_text_list',
              style: 'bullet',
              elements: absenceEvents.map((event: CalendarEvent) => {
                const memberName = getMemberNameFromEventSummary(event.summary);
                const dayPart = getDayPartFromEventSummary(event.summary);
                return {
                  type: 'rich_text_section',
                  elements: [
                    {
                      type: 'text',
                      text: `${memberName}: `,
                    },
                    {
                      type: 'text',
                      text: dayPart,
                    },
                  ],
                };
              }),
            },
          ],
        },
      ],
    });
    res.end();
  } catch (error) {
    console.log(error);
  }
}
