import {
  AllMiddlewareArgs,
  BlockButtonAction,
  SlackActionMiddlewareArgs,
} from '@slack/bolt';

export async function createAbsenceFromSuggestion({
  ack,
  payload,
  body,
}: AllMiddlewareArgs & SlackActionMiddlewareArgs<BlockButtonAction>) {
  await ack();
  fetch(`${process.env.API_ENDPOINT}/create-absence`, {
    method: 'POST',
    body: new URLSearchParams({
      ...JSON.parse(payload.value),
      actionUserId: body.user.id,
      showReason: 'false',
    }),
    headers: { Authorization: process.env.SLACK_BOT_TOKEN },
  });
}
