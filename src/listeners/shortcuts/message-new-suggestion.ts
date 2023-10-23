import { App } from '@slack/bolt';
import { findMemberById } from '../../helpers.js';
import newSuggestionModal from '../../user-interface/modals/new-suggestion.js';

export default function messageNewSuggestion(app: App) {
  app.shortcut(
    { callback_id: 'message_new_suggestion', type: 'message_action' },
    async ({ shortcut, ack, client, logger }) => {
      await ack();
      const targetUserId = shortcut.message.user;
      if (!targetUserId) return;

      try {
        await client.views.open({
          trigger_id: shortcut.trigger_id,
          view: newSuggestionModal(
            targetUserId,
            shortcut.message.text || '',
            shortcut.message_ts,
          ),
        });

        const actionUser = findMemberById(shortcut.user.id);
        if (!actionUser) throw Error('member not found');
        logger.info(
          `${actionUser.name} is opening new suggestion modal from message shortcut`,
        );
      } catch (error) {
        if (error instanceof Error) {
          logger.error(error.message);
        }
      }
    },
  );
}
