import { App } from '@slack/bolt';
import newAbsenceModal from '../../user-interface/modals/new-absence';

export default function appHomeNewAbsence(app: App) {
  app.action(
    { type: 'block_actions', action_id: 'app-home-new-absence' },
    async ({ ack, body, client, logger }) => {
      // Acknowledge the button request
      await ack();

      try {
        // Call views.update with the built-in client
        await client.views.open({
          trigger_id: body.trigger_id,
          view: newAbsenceModal(),
        });

        const userInfo = await client.users.info({ user: body.user.id });
        const realName = userInfo.user?.profile?.real_name;
        logger.info(`${realName} is opening new absence modal from app home`);
      } catch (error) {
        logger.error(error);
      }
    },
  );
}
