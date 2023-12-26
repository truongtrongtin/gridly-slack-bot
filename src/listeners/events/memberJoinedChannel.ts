import { AllMiddlewareArgs, SlackEventMiddlewareArgs } from '@slack/bolt';

export async function memberJoinedChannel({
  event,
  client,
}: AllMiddlewareArgs & SlackEventMiddlewareArgs<'member_joined_channel'>) {
  await client.chat.postMessage({
    channel: process.env.SLACK_CHANNEL,
    text: `Hi <@${event.user}>, nice to meet you! :wave:`,
  });
}
