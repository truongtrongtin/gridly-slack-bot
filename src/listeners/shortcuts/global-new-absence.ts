import { App } from '@slack/bolt';
import newAbsenceModal from '../../user-interface/modals/new-absence';

export default function globalNewAbsence(app: App) {
  app.shortcut(
    'register_absences',
    async ({ shortcut, ack, client, logger }) => {
      await ack();

      try {
        await client.views.open({
          trigger_id: shortcut.trigger_id,
          view: newAbsenceModal(),
        });
      } catch (error) {
        logger.error(error);
      }
    },
  );
}
