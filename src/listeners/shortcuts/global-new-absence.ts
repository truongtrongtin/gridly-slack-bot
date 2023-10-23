import { App } from '@slack/bolt';
import { findMemberById } from '../../helpers.js';
import newAbsenceModal from '../../user-interface/modals/new-absence.js';

export default function globalNewAbsence(app: App) {
  app.shortcut(
    { callback_id: 'global_new_absence', type: 'shortcut' },
    async ({ shortcut, ack, client, logger }) => {
      await ack();

      try {
        await client.views.open({
          trigger_id: shortcut.trigger_id,
          view: newAbsenceModal(shortcut.user.id),
        });

        const foundMember = findMemberById(shortcut.user.id);
        if (!foundMember) throw Error('member not found');
        logger.info(
          `${foundMember.name} is opening new absence modal from global shortcut`,
        );
      } catch (error) {
        if (error instanceof Error) {
          logger.error(error.message);
        }
      }
    },
  );
}
