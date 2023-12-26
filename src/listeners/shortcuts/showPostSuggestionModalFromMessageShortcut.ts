import {
  AllMiddlewareArgs,
  MessageShortcut,
  SlackShortcutMiddlewareArgs,
} from '@slack/bolt';
import { findMemberById } from '../../helpers.js';
import { createSuggestionView } from '../../user-interface/createSuggestionView.js';

export async function showPostSuggestionModalFromMessageShortcut({
  shortcut,
  ack,
  client,
  logger,
}: AllMiddlewareArgs & SlackShortcutMiddlewareArgs<MessageShortcut>) {
  await ack();
  const targetUserId = shortcut.message.user;
  if (!targetUserId) return;

  await client.views.open({
    trigger_id: shortcut.trigger_id,
    view: createSuggestionView(
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
}
