import { View } from '@slack/bolt';

export default function deleleteMessageConfirm(
  messageText: string,
  messageTs: string,
): View {
  const quote = messageText
    .split('\n')
    .map((text: string) => `>${text}`)
    .join('\n');

  return {
    type: 'modal',
    callback_id: 'delete-message-submit',
    // notify_on_close: true,
    private_metadata: JSON.stringify({ messageTs }),
    title: {
      type: 'plain_text',
      text: 'Delete confirm',
    },
    submit: {
      type: 'plain_text',
      text: 'Delete',
      emoji: true,
    },
    close: {
      type: 'plain_text',
      text: 'Cancel',
      emoji: true,
    },
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `${quote}\nAre you sure to delete this message?`,
        },
      },
    ],
  };
}
