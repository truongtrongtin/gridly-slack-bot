import {
  AllMiddlewareArgs,
  BlockAction,
  SlackActionMiddlewareArgs,
} from '@slack/bolt';
import { startOfToday } from 'date-fns';
import { findMemberById } from '../../helpers.js';
import { getAccessTokenFromRefreshToken } from '../../services/getAccessTokenFromRefreshToken.js';
import { CalendarEvent } from '../../types.js';
import { appHomeView } from '../../user-interface/appHomeView.js';

export async function deleteAbsenceFromAppHome({
  ack,
  body,
  client,
  logger,
}: AllMiddlewareArgs & SlackActionMiddlewareArgs<BlockAction>) {
  // Acknowledge the button request
  await ack();

  const eventId = body.actions[0].block_id;

  try {
    const foundMember = findMemberById(body.user.id);
    if (!foundMember) throw Error('member not found');
    logger.info(`${foundMember.name} is deleting absence`);

    const accessToken = await getAccessTokenFromRefreshToken();

    // Get absence event from google calendar
    const eventResponse = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${process.env.GOOGLE_CALENDAR_ID}/events/${eventId}`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    const eventObject: CalendarEvent = await eventResponse.json();

    const startDate = eventObject.start.date;
    if (
      new Date(startDate).setHours(0, 0, 0, 0) < new Date().setHours(0, 0, 0, 0)
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

    const message_ts = eventObject.extendedProperties.private.message_ts;
    if (message_ts) {
      // Delete announced message
      await client.chat.delete({
        channel: process.env.SLACK_CHANNEL,
        ts: message_ts,
      });
    }

    // Get events from google calendar
    const queryParams = new URLSearchParams({
      timeMin: startOfToday().toISOString(),
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
      view_id: body.view!.id,
      view: appHomeView(absenceEvents, body.user.id),
    });
  } catch (error) {
    if (error instanceof Error) {
      logger.error(error.message);
    }
  }
}
