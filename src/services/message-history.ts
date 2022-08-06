import { Datastore } from '@google-cloud/datastore';
import { serviceAccountKey } from './service-account-key';

export interface MessageEntity {
  text: string;
  originalTs: string;
  ts: string;
  channel: string;
  team: string;
}

const datastore = new Datastore({
  projectId: serviceAccountKey.project_id,
  credentials: serviceAccountKey,
});

export async function addMessage(message: MessageEntity) {
  const messageKey = datastore.key('Message');

  const entity = {
    key: messageKey,
    data: [
      {
        name: 'text',
        value: message.text,
        excludeFromIndexes: true,
      },
      {
        name: 'original_ts',
        value: message.originalTs,
      },
      {
        name: 'ts',
        value: message.ts,
      },
      {
        name: 'channel',
        value: message.channel,
      },
      {
        name: 'team',
        value: message.team,
      },
    ],
  };
  await datastore.save(entity);
}

export async function listMessages(
  team: string,
  channel: string,
  originalTs: string,
) {
  const query = datastore
    .createQuery('Message')
    .filter('team', '=', team)
    .filter('channel', '=', channel)
    .filter('original_ts', '=', originalTs)
    .order('ts', { descending: true });
  const [messages] = await datastore.runQuery(query);
  return messages;
}

export async function deleteMessages(
  team: string,
  channel: string,
  originalTs: string,
) {
  const messages = await listMessages(team, channel, originalTs);
  if (messages.length === 0) return;
  const messageKeys = messages.map((message) => message[datastore.KEY]);
  await datastore.delete(messageKeys);
}
