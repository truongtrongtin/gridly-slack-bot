import {
  AllMiddlewareArgs,
  BlockButtonAction,
  SlackActionMiddlewareArgs,
} from '@slack/bolt';
import { AbsencePayload } from '../../types.js';
import { createAbsenceView } from '../../user-interface/createAbsenceView.js';

export async function showCreateAbsenceModalFromSuggestion({
  ack,
  body,
  client,
  payload,
}: AllMiddlewareArgs & SlackActionMiddlewareArgs<BlockButtonAction>) {
  await ack();
  if (!payload.value) {
    await client.views.open({
      trigger_id: body.trigger_id,
      view: createAbsenceView(body.user.id),
    });
    return;
  }

  const absencePayload: AbsencePayload = JSON.parse(payload.value);
  await client.views.open({
    trigger_id: body.trigger_id,
    view: createAbsenceView(body.user.id, absencePayload),
  });
}
