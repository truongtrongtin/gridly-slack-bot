import {
  AllMiddlewareArgs,
  BlockAction,
  ButtonAction,
  SlackActionMiddlewareArgs,
} from '@slack/bolt';
import { AbsencePayload } from '../../types.js';
import { createAbsenceView } from '../../user-interface/createAbsenceView.js';

export async function showCreateAbsenceModalFromSuggestion({
  ack,
  body,
  client,
  logger,
  payload,
}: AllMiddlewareArgs & SlackActionMiddlewareArgs<BlockAction>) {
  await ack();
  try {
    if (!(<ButtonAction>payload).value) {
      await client.views.open({
        trigger_id: body.trigger_id,
        view: createAbsenceView(body.user.id),
      });
      return;
    }

    const absencePayload: AbsencePayload = JSON.parse(
      (<ButtonAction>payload).value,
    );
    await client.views.open({
      trigger_id: body.trigger_id,
      view: createAbsenceView(body.user.id, absencePayload),
    });
  } catch (error) {
    if (error instanceof Error) {
      logger.error(error.message);
    }
  }
}
