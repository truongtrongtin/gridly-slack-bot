import {
  AllMiddlewareArgs,
  BlockButtonAction,
  SlackActionMiddlewareArgs,
} from '@slack/bolt';

export async function createAbsenceFromSuggestion({
  ack,
  action,
  body,
}: AllMiddlewareArgs & SlackActionMiddlewareArgs<BlockButtonAction>) {
  await ack();
  if (!body.channel || !body.message || !action.value) return;
  fetch(`${process.env.API_ENDPOINT}/create-absence`, {
    method: 'POST',
    body: new URLSearchParams({
      ...JSON.parse(action.value),
      actionUserId: body.user.id,
      showReason: 'false',
      channelId: body.channel.id,
      threadTs: body.message.ts,
    }),
    headers: { Authorization: process.env.SLACK_BOT_TOKEN },
  });
}
