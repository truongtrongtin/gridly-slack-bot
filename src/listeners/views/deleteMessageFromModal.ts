import {
  AllMiddlewareArgs,
  SlackViewMiddlewareArgs,
  ViewSubmitAction,
} from '@slack/bolt';

export async function deleteMessageFromModal({
  ack,
  view,
  client,
}: AllMiddlewareArgs & SlackViewMiddlewareArgs<ViewSubmitAction>) {
  await ack();
  const { messageTs } = JSON.parse(view.private_metadata);
  await client.chat.delete({
    channel: process.env.SLACK_CHANNEL,
    ts: messageTs,
  });
}
