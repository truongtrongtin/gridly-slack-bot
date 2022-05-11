import { Block, KnownBlock, View } from '@slack/bolt';
import { subDays } from 'date-fns';
import { generateTimeText, getDayPartFromEventSummary } from '../helpers';

export default function appHomeView(
  absenceEvents: any[],
  firstName: string,
): View {
  return {
    type: 'home',
    blocks: [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: `:house: Hi ${firstName}! Here's what you can do:`,
          emoji: true,
        },
      },
      {
        type: 'actions',
        elements: [
          {
            type: 'button',
            action_id: 'app-home-new-absence',
            text: {
              type: 'plain_text',
              text: 'Register New Absence',
              emoji: true,
            },
            style: 'primary',
          },
          // {
          //   type: 'button',
          //   action_id: 'app-home-refresh',
          //   text: {
          //     type: 'plain_text',
          //     text: 'Refresh',
          //     emoji: true,
          //   },
          // },
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
            absenceEvents.length
              ? 'Your planned absences'
              : 'No planned absences yet'
          }`,
          emoji: true,
        },
      },
      {
        type: 'divider',
      },
      ...absenceEvents.reduce((results: (KnownBlock | Block)[], event: any) => {
        const dayPart = getDayPartFromEventSummary(event.summary);
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
            text: timeText,
            verbatim: true,
          },
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
        });

        results.push({
          type: 'divider',
        });

        return results;
      }, []),
    ],
  };
}
