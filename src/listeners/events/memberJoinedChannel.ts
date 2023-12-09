import { AllMiddlewareArgs, SlackEventMiddlewareArgs } from '@slack/bolt';

export async function memberJoinedChannel({
  event,
  client,
  logger,
}: AllMiddlewareArgs & SlackEventMiddlewareArgs<'member_joined_channel'>) {
  try {
    await client.chat.postMessage({
      channel: process.env.SLACK_CHANNEL,
      text: `Hi <@${event.user}>, nice to meet you! :wave:`,
    });
  } catch (error) {
    if (error instanceof Error) {
      logger.error(error.message);
    }
  }
}
