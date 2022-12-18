import { App } from '@slack/bolt';

export default function deleteMessageSubmit(app: App) {
  app.view('delete-message-submit', async ({ ack, view, client, logger }) => {
    await ack();
    try {
      const { messageTs } = JSON.parse(view.private_metadata);
      await client.chat.delete({
        channel: process.env.SLACK_CHANNEL!,
        ts: messageTs,
      });
    } catch (error) {
      if (error instanceof Error) {
        logger.error(error.message);
      }
    }
  });
}
