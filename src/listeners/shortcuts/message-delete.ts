import { App } from '@slack/bolt';
import { findMemberById } from '../../helpers';
import deleleteMessageConfirm from '../../user-interface/modals/delete-message-confirm';

export default function messageDelete(app: App) {
  app.shortcut(
    { callback_id: 'message_delete', type: 'message_action' },
    async ({ shortcut, ack, client, logger }) => {
      await ack();
      const messageText = shortcut.message.text;
      if (!messageText) return;
      const messageTs = shortcut.message.ts;
      try {
        await client.views.open({
          trigger_id: shortcut.trigger_id,
          view: deleleteMessageConfirm(messageText, messageTs),
        });

        const foundMember = findMemberById(shortcut.user.id);
        if (!foundMember) throw Error('member not found');
        logger.info(
          `${foundMember.name} is opening delete message modal from message shortcut`,
        );
      } catch (error) {
        if (error instanceof Error) {
          logger.error(error.message);
        }
      }
    },
  );
}
