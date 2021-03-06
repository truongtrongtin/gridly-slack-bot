import { App } from '@slack/bolt';
import { hasAdminRole } from '../../helpers';
import newAbsenceModal from '../../user-interface/modals/new-absence';

export default function appHomeNewAbsence(app: App) {
  app.action(
    { type: 'block_actions', action_id: 'app-home-new-absence' },
    async ({ ack, body, client, logger }) => {
      await ack();

      try {
        const viewOpenResponse = await client.views.open({
          trigger_id: body.trigger_id,
          view: newAbsenceModal({ showMemberSelect: false }),
        });

        const userInfo = await client.users.info({ user: body.user.id });
        const email = userInfo.user?.profile?.email;
        const isAdmin = hasAdminRole(email);
        const realName = userInfo.user?.profile?.real_name;
        logger.info(`${realName} is opening new absence modal from app home`);

        if (isAdmin) {
          await client.views.update({
            view_id: viewOpenResponse.view?.id,
            view: newAbsenceModal({
              showMemberSelect: true,
              adminId: body.user.id,
            }),
          });
        }
      } catch (error) {
        logger.error(error);
      }
    },
  );
}
