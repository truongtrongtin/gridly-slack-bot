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
  action,
}: AllMiddlewareArgs & SlackActionMiddlewareArgs<BlockButtonAction>) {
  await ack();
  const absencePayload: AbsencePayload | undefined = action.value
    ? JSON.parse(action.value)
    : undefined;
  await client.views.open({
    trigger_id: body.trigger_id,
    view: createAbsenceView(body.user.id, absencePayload),
  });
}
