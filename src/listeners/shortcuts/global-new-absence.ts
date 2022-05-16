import { App } from '@slack/bolt';
import newAbsenceModal from '../../user-interface/modals/new-absence';

export default function globalNewAbsence(app: App) {
  app.shortcut(
    'register_absences',
    async ({ shortcut, ack, client, logger }) => {
      try {
        await ack();

        await client.views.open({
          trigger_id: shortcut.trigger_id,
          view: newAbsenceModal(),
        });

        const userInfo = await client.users.info({ user: shortcut.user.id });
        const realName = userInfo.user?.profile?.real_name;
        logger.info(
          `${realName} is opening new absence modal from global shortcut`,
        );
      } catch (error) {
        logger.error(error);
      }
    },
  );
}
