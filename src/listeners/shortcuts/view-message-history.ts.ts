import { App, MessageShortcut } from '@slack/bolt';
import { isToday, isYesterday } from 'date-fns';
import { listMessages, MessageEntity } from '../../services/message-history';

export default function viewMessageHistory(app: App) {
  app.shortcut(
    'view_edit_history',
    async ({ shortcut, ack, client, logger }) => {
      // console.log('shortcut', shortcut);
      await ack();
      try {
        shortcut = shortcut as MessageShortcut;

        if (!Boolean(shortcut.message.edited)) {
          await client.views.open({
            trigger_id: shortcut.trigger_id,
            view: {
              type: 'modal',
              title: {
                type: 'plain_text',
                text: 'Edit history',
                emoji: true,
              },
              close: {
                type: 'plain_text',
                text: 'Close',
                emoji: true,
              },
              blocks: [
                {
                  type: 'section',
                  text: {
                    type: 'mrkdwn',
                    text: 'This message has not been edited yet.',
                  },
                },
              ],
            },
          });
          return;
        }

        const viewOpenResponse = await client.views.open({
          trigger_id: shortcut.trigger_id,
          view: {
            type: 'modal',
            title: {
              type: 'plain_text',
              text: 'Edit history',
              emoji: true,
            },
            close: {
              type: 'plain_text',
              text: 'Close',
              emoji: true,
            },
            blocks: [
              {
                type: 'section',
                text: {
                  type: 'plain_text',
                  text: ':hourglass: Loading...',
                  emoji: true,
                },
              },
            ],
          },
        });

        if (!shortcut.team) return;
        const messages = await listMessages(
          shortcut.team.id,
          shortcut.channel.id,
          shortcut.message.ts,
        );

        if (messages.length === 0) {
          await client.views.update({
            view_id: viewOpenResponse.view?.id,
            view: {
              type: 'modal',
              title: {
                type: 'plain_text',
                text: 'Edit history',
                emoji: true,
              },
              close: {
                type: 'plain_text',
                text: 'Close',
                emoji: true,
              },
              blocks: [
                {
                  type: 'section',
                  text: {
                    type: 'mrkdwn',
                    text: 'The edit history of this message is unreachable.',
                  },
                },
              ],
            },
          });
          return;
        }

        await client.views.update({
          view_id: viewOpenResponse.view?.id,
          view: {
            type: 'modal',
            title: {
              type: 'plain_text',
              text: 'Edit history',
              emoji: true,
            },
            close: {
              type: 'plain_text',
              text: 'Close',
              emoji: true,
            },
            blocks: [
              {
                type: 'context',
                elements: [
                  {
                    type: 'mrkdwn',
                    text: `Edited by <@${shortcut.message.edited.user}>`,
                  },
                ],
              },
              {
                type: 'section',
                text: {
                  type: 'mrkdwn',
                  text: shortcut.message.text,
                },
              },
              {
                type: 'context',
                elements: [
                  {
                    type: 'mrkdwn',
                    text: `*Current Version*, ${generateTimeText(
                      new Date(Number(shortcut.message.edited.ts) * 1000),
                    )}`,
                  },
                ],
              },
              ...messages.reduce((results, message: MessageEntity) => {
                results.push({
                  type: 'divider',
                });
                results.push({
                  type: 'section',
                  text: {
                    type: 'mrkdwn',
                    text: message.text,
                  },
                });
                results.push({
                  type: 'context',
                  elements: [
                    {
                      type: 'plain_text',
                      text: generateTimeText(
                        new Date(Number(message.ts) * 1000),
                      ),
                      emoji: true,
                    },
                  ],
                });
                return results;
              }, []),
            ],
          },
        });
      } catch (error) {
        if (error instanceof Error) {
          logger.error(error.message);
        }
      }
    },
  );
}

function generateTimeText(date: Date) {
  let day = '';
  if (isToday(date)) {
    day = 'Today';
  } else if (isYesterday(date)) {
    day = 'Yesterday';
  } else {
    day = new Date(date).toLocaleString('en-US', {
      day: 'numeric',
      month: 'short',
    });
  }
  const time = new Date(date).toLocaleString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  return `${day} at ${time}`;
}
