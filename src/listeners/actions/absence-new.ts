import { App, ButtonAction } from '@slack/bolt';
import { AbsencePayload } from '../../types';
import newAbsenceModal from '../../user-interface/modals/new-absence';

export default function absenceNew(app: App) {
  app.action(
    { type: 'block_actions', action_id: 'absence-new' },
    async ({ ack, body, client, logger, payload }) => {
      await ack();
      try {
        if (!(<ButtonAction>payload).value) {
          await client.views.open({
            trigger_id: body.trigger_id,
            view: newAbsenceModal(body.user.id),
          });
          return;
        }

        const absencePayload: AbsencePayload = JSON.parse(
          (<ButtonAction>payload).value,
        );
        await client.views.open({
          trigger_id: body.trigger_id,
          view: newAbsenceModal(body.user.id, absencePayload),
        });
      } catch (error) {
        if (error instanceof Error) {
          logger.error(error.message);
        }
      }
    },
  );
}
