import { Block, KnownBlock, View } from '@slack/bolt';
import { subDays } from 'date-fns';
import {
  findMemberById,
  generateTimeText,
  getDayPartFromEventSummary,
  getMemberNameFromEventSummary,
} from '../helpers.js';
import { CalendarEvent } from '../types.js';

export function appHomeView(
  absenceEvents: CalendarEvent[],
  userId: string,
): View {
  return {
    type: 'home',
    blocks: [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: `:house: Here's what you can do:`,
          emoji: true,
        },
      },
      {
        type: 'actions',
        elements: [
          {
            type: 'button',
            action_id: 'absence-new',
            text: {
              type: 'plain_text',
              text: 'Register New Absence',
              emoji: true,
            },
            style: 'primary',
          },
        ],
      },
      {
        type: 'context',
        elements: [
          {
            type: 'image',
            image_url:
              'https://api.slack.com/img/blocks/bkb_template_images/placeholder.png',
            alt_text: 'placeholder',
          },
        ],
      },
      {
        type: 'section',
        text: {
          type: 'plain_text',
          text: `:date: ${
            absenceEvents.length > 0
              ? 'Current and upcoming absences'
              : 'No absences'
          }`,
          emoji: true,
        },
      },
      {
        type: 'divider',
      },
      ...absenceEvents.reduce(
        (results: (KnownBlock | Block)[], event: CalendarEvent) => {
          const dayPart = getDayPartFromEventSummary(event.summary);
          const memberName = getMemberNameFromEventSummary(event.summary);
          const foundMember = findMemberById(userId);
          if (!foundMember) throw Error('member not found');
          const isBelongToMe = memberName === foundMember.name;
          const isAdmin = foundMember.admin;
          const timeText = generateTimeText(
            new Date(event.start.date),
            subDays(new Date(event.end.date), 1),
            dayPart,
          );

          results.push({
            type: 'section',
            block_id: event.id,
            text: {
              type: 'mrkdwn',
              text: `*${memberName}*\n${timeText}`,
              verbatim: true,
            },
            ...((isAdmin || isBelongToMe) && {
              accessory: {
                type: 'button',
                action_id: 'app-home-absence-delete',
                text: {
                  type: 'plain_text',
                  text: 'Delete',
                  emoji: true,
                },
                style: 'danger',
                confirm: {
                  title: {
                    type: 'plain_text',
                    text: 'Delete absence',
                    emoji: true,
                  },
                  text: {
                    type: 'mrkdwn',
                    text: `Are you sure you want to delete this absence? This cannot be undone.`,
                    verbatim: true,
                  },
                  confirm: { type: 'plain_text', text: 'Delete', emoji: true },
                  style: 'danger',
                },
              },
            }),
          });

          results.push({
            type: 'divider',
          });

          return results;
        },
        [],
      ),
    ],
  };
}
