// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck

import { App } from '@slack/bolt';
import { isGenericMessageEvent } from '../../helpers';
import members from '../../member-list.json';

export default function remindToUseMe(app: App) {
  // Listens to incoming messages that contain "hello"
  app.message('off', async ({ message, client, say }) => {
    // Filter out message events with subtypes (see https://api.slack.com/events/message)
    // Is there a way to do this in listener middleware with current type system?
    if (message.channel !== process.env.SLACK_CHANNEL) return;
    if (!isGenericMessageEvent(message)) return;

    if (!message.blocks) return;

    const mentionedUserIds: string[] = [];
    for (const block of message.blocks) {
      for (const element1 of block.elements) {
        for (const element2 of element1.elements) {
          if (element2.type === 'user') {
            mentionedUserIds.push(element2.user_id);
          }
        }
      }
    }

    const userEmails = await Promise.all(
      mentionedUserIds.map(async (userId) => {
        const userInfoResponse = await client.users.info({ user: userId });
        return userInfoResponse.user?.profile?.email;
      }),
    );

    const adminEmails = members.reduce((emails, member) => {
      if (member.isAdmin) emails.push(member.email);
      return emails;
    }, []);

    let adminMentioned = false;
    for (const email of userEmails) {
      if (adminEmails.includes(email)) {
        adminMentioned = true;
        break;
      }
    }
    if (!adminMentioned) return;

    await say({
      thread_ts: message.ts,
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `<@${message.user}> Please stop tagging HRs for absence, use \`Off\` shortcut instead!`,
          },
        },
      ],
      text: `<@${message.user}> Please stop tagging HRs for absence, use Off shortcut instead!`,
    });
  });
}
