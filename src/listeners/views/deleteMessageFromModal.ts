import {
  AllMiddlewareArgs,
  SlackViewMiddlewareArgs,
  ViewSubmitAction,
} from '@slack/bolt';

export async function deleteMessageFromModal({
  ack,
  view,
  client,
  logger,
}: AllMiddlewareArgs & SlackViewMiddlewareArgs<ViewSubmitAction>) {
  await ack({ response_action: 'clear' });
  try {
    const { messageTs } = JSON.parse(view.private_metadata);
    await client.chat.delete({
      channel: process.env.SLACK_CHANNEL,
      ts: messageTs,
    });
  } catch (error) {
    if (error instanceof Error) {
      logger.error(error.message);
    }
  }
}
