import { App } from '@slack/bolt';
import newAbsenceModal from '../../user-interface/modals/new-absence';

export default function globalNewAbsence(app: App) {
  app.shortcut(
    'register_absences',
    async ({ shortcut, ack, client, logger }) => {
      try {
        // Acknowledge shortcut request
        await ack();

        // Call the views.open method using one of the built-in WebClients
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
