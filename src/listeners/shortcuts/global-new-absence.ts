import { App } from '@slack/bolt';
import { hasAdminRole } from '../../helpers';
import newAbsenceModal from '../../user-interface/modals/new-absence';

export default function globalNewAbsence(app: App) {
  app.shortcut(
    'register_absences',
    async ({ shortcut, ack, client, logger }) => {
      try {
        await ack();
        const userInfo = await client.users.info({ user: shortcut.user.id });
        const email = userInfo.user?.profile?.email;
        const isAdmin = hasAdminRole(email!);
        const realName = userInfo.user?.profile?.real_name;
        logger.info(
          `${realName} is opening new absence modal from global shortcut`,
        );

        await client.views.open({
          trigger_id: shortcut.trigger_id,
          view: newAbsenceModal(isAdmin, shortcut.user.id),
        });
      } catch (error) {
        logger.error(error);
      }
    },
  );
}
