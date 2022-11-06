import { App } from '@slack/bolt';
import newAbsenceModal from '../../user-interface/modals/new-absence';

export default function absenceNew(app: App) {
  app.action(
    { type: 'block_actions', action_id: 'absence-new' },
    async ({ ack, body, client, logger }) => {
      await ack();

      try {
        await client.views.open({
          trigger_id: body.trigger_id,
          view: newAbsenceModal(body.user.id),
        });
      } catch (error) {
        if (error instanceof Error) {
          logger.error(error.message);
        }
      }
    },
  );
}
