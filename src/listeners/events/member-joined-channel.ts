import { App } from '@slack/bolt';

export default function memberJoinedChannel(app: App) {
  app.event('member_joined_channel', async ({ event, client, logger }) => {
    try {
      await client.chat.postMessage({
        channel: process.env.SLACK_CHANNEL!,
        text: `Hi <@${event.user}>, nice to meet you! :wave:`,
      });
    } catch (error) {
      if (error instanceof Error) {
        logger.error(error.message);
      }
    }
  });
}
