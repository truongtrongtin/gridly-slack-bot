import {
  AllMiddlewareArgs,
  MessageShortcut,
  SlackShortcutMiddlewareArgs,
} from '@slack/bolt';
import { findMemberById } from '../../helpers.js';
import { deleteMessageView } from '../../user-interface/deleteMessageView.js';

export async function showDeleteMessageModalFromMessageShortcut({
  shortcut,
  ack,
  client,
  logger,
}: AllMiddlewareArgs & SlackShortcutMiddlewareArgs<MessageShortcut>) {
  try {
    await ack();
    const messageText = shortcut.message.text;
    if (!messageText) return;
    const messageTs = shortcut.message.ts;
    await client.views.open({
      trigger_id: shortcut.trigger_id,
      view: deleteMessageView(messageText, messageTs),
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
}
