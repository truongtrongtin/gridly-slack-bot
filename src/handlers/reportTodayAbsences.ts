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
  // Verify token from Google Cloud Scheduler
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

  // If today is Christmas, return
  const today = new Date();
  if (today.getDate() === 25 && today.getMonth() === 11) {
    return res.end();
  }

  const accessToken = await getAccessTokenFromRefreshToken();

  // If today is public holiday, return
  // const publicHolidaysQueryParams = new URLSearchParams({
  //   timeMin: startOfToday().toISOString(),
  //   timeMax: startOfTomorrow().toISOString(),
  //   q: 'Public holiday',
  // });
  // const calendarId = encodeURIComponent(
  //   'en.vietnamese#holiday@group.v.calendar.google.com',
  // );
  // const publicHolidaysResponse = await fetch(
  //   `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events?${publicHolidaysQueryParams}`,
  //   { headers: { Authorization: `Bearer ${accessToken}` } },
  // );
  // const publicHolidaysData = await publicHolidaysResponse.json();
  // if (publicHolidaysData.items.length > 0) {
  //   return res.send('Skipped due to public holiday');
  // }

  // Get today's absense events
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

  if (absenceEvents.length === 0) {
    return res.end('No absences today');
  }

  // Post message to Slack
  await slackApp.client.chat.postMessage({
    channel: process.env.SLACK_CHANNEL,
    text: `${absenceEvents.length} absences today!`,
    blocks: [
      {
        type: 'rich_text',
        elements: [
          {
            type: 'rich_text_section',
            elements: [
              {
                type: 'text',
                text: "Today's planned absences:\n",
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
}
