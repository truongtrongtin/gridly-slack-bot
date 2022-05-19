import { App } from '@slack/bolt';
import { hasAdminRole } from '../../helpers';
import newAbsenceModal from '../../user-interface/modals/new-absence';

export default function globalNewAbsence(app: App) {
  app.shortcut(
    'register_absences',
    async ({ shortcut, ack, client, logger }) => {
      try {
        await ack();

        const viewOpenResponse = await client.views.open({
          trigger_id: shortcut.trigger_id,
          view: newAbsenceModal({ showMemberSelect: false }),
        });

        const userInfo = await client.users.info({ user: shortcut.user.id });
        const email = userInfo.user?.profile?.email;
        const isAdmin = hasAdminRole(email);
        const realName = userInfo.user?.profile?.real_name;
        logger.info(
          `${realName} is opening new absence modal from global shortcut`,
        );

        if (isAdmin) {
          await client.views.update({
            view_id: viewOpenResponse.view?.id,
            view: newAbsenceModal({
              showMemberSelect: true,
              adminId: shortcut.user.id,
            }),
          });
        }
      } catch (error) {
        logger.error(error);
      }
    },
  );
}
