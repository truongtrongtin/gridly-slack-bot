import {
  AllMiddlewareArgs,
  GlobalShortcut,
  SlackShortcutMiddlewareArgs,
} from '@slack/bolt';
import { findMemberById } from '../../helpers.js';
import { createAbsenceView } from '../../user-interface/createAbsenceView.js';

export async function showCreateAbsenceModalFromGlobalShortcut({
  shortcut,
  ack,
  client,
  logger,
}: AllMiddlewareArgs & SlackShortcutMiddlewareArgs<GlobalShortcut>) {
  await ack();

  await client.views.open({
    trigger_id: shortcut.trigger_id,
    view: createAbsenceView(shortcut.user.id),
  });

  const foundMember = findMemberById(shortcut.user.id);
  if (!foundMember) throw Error('member not found');
  logger.info(
    `${foundMember.name} is opening new absence modal from global shortcut`,
  );
}
