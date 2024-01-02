import { addDays, format } from 'date-fns';
import { Request, Response } from 'express';
import { findMemberById, generateTimeText } from '../helpers.js';
import { slackApp } from '../main.js';
import { getAccessTokenFromRefreshToken } from '../services/getAccessTokenFromRefreshToken.js';
import { AbsencePayload, DayPart } from '../types.js';

export async function createAbsence(req: Request, res: Response) {
  try {
    if (req.headers.authorization !== process.env.SLACK_BOT_TOKEN) {
      return res.sendStatus(403);
    }

    const {
      actionUserId,
      targetUserId,
      startDateString,
      endDateString,
      dayPart,
      reason,
      showReason,
      threadTs,
      channelId,
    } = req.body as AbsencePayload & {
      actionUserId: string;
      showReason: string;
      channelId: string;
      threadTs?: string;
    };

    const startDate = new Date(startDateString);
    const endDate = new Date(endDateString);
    const actionUser = findMemberById(actionUserId);
    if (!actionUser) throw Error('action user not found');
    const actionUserName = actionUser.name;
    const isAdmin = actionUser.admin;

    if (targetUserId !== actionUserId && !isAdmin) {
      await slackApp.client.chat.postEphemeral({
        channel: process.env.SLACK_CHANNEL,
        user: actionUserId,
        text: ':x: You are not authorized to perform this action!',
      });
      return res.end();
    }

    const targetUser = findMemberById(targetUserId);
    if (!targetUser) throw Error('target user not found');
    const targetUserName = targetUser.name;

    if (!isAdmin && actionUser.id === targetUser.id) {
      console.log(`${actionUserName} is submiting absence`);
    } else {
      console.log(
        `admin ${actionUserName} is submiting absence for ${targetUserName}`,
      );
    }

    const accessToken = await getAccessTokenFromRefreshToken();
    const dayPartText = dayPart === DayPart.FULL ? '(off)' : `(off ${dayPart})`;
    const summary = `${targetUserName} ${dayPartText}`;
    const timeText = generateTimeText(startDate, endDate, dayPart);
    const trimmedReason = reason.trim();
    const messageText =
      showReason === 'true' && trimmedReason ? ` Reason: ${reason}` : '';

    const newMessage = await slackApp.client.chat.postMessage({
      channel: channelId,
      text: `<@${targetUserId}> will be absent *${timeText}*.${messageText}`,
      ...(threadTs ? { thread_ts: threadTs } : {}),
    });

    // Create new event on google calendar
    await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${process.env.GOOGLE_CALENDAR_ID}/events`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          start: {
            date: startDateString,
          },
          end: {
            date: format(addDays(endDate, 1), 'yyyy-MM-dd'),
          },
          summary,
          attendees: [
            {
              email: targetUser.email,
              responseStatus: 'accepted',
            },
          ],
          sendUpdates: 'all',
          extendedProperties: {
            private: {
              message_ts: newMessage.message?.ts,
              ...(trimmedReason ? { reason: trimmedReason } : {}),
            },
          },
          transparency: 'transparent',
        }),
      },
    );
    res.end();
  } catch (error) {
    console.log(error);
  }
}
