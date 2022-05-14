import { App } from '@slack/bolt';
import { hasAdminRole } from '../../helpers';
import newAbsenceModal from '../../user-interface/modals/new-absence';

export default function appHomeNewAbsence(app: App) {
  app.action(
    { type: 'block_actions', action_id: 'app-home-new-absence' },
    async ({ ack, body, client, logger }) => {
      // Acknowledge the button request
      await ack();
      const userInfo = await client.users.info({ user: body.user.id });
      const email = userInfo.user?.profile?.email;
      const isAdmin = hasAdminRole(email!);
      const realName = userInfo.user?.profile?.real_name;
      logger.info(`${realName} is opening new absence modal from app home`);

      try {
        // Call views.update with the built-in client
        await client.views.open({
          trigger_id: body.trigger_id,
          view: newAbsenceModal(isAdmin, body.user.id),
        });
      } catch (error) {
        logger.error(error);
      }
    },
  );
}
