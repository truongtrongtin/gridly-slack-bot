import slackBolt from '@slack/bolt';
import { createAbsence } from './handlers/createAbsence.js';
import { createAbsenceFromSuggestion } from './listeners/actions/createAbsenceFromSuggestion.js';
import { deleteAbsenceFromAppHome } from './listeners/actions/deleteAbsenceFromAppHome.js';
import { showCreateAbsenceModalFromSuggestion } from './listeners/actions/showCreateAbsenceModalFromSuggestion.js';
import { appHomeOpened } from './listeners/events/appHomeOpened.js';
import { memberJoinedChannel } from './listeners/events/memberJoinedChannel.js';
import { postSuggestionFromMessage } from './listeners/messages/postSuggestionFromMessage.js';
import { showCreateAbsenceModalFromGlobalShortcut } from './listeners/shortcuts/showCreateAbsenceModalFromGlobalShortcut.js';
import { showDeleteMessageModalFromMessageShortcut } from './listeners/shortcuts/showDeleteMessageModalFromMessageShortcut.js';
import { showPostSuggestionModalFromMessageShortcut } from './listeners/shortcuts/showPostSuggestionModalFromMessageShortcut.js';
import { createAbsenceFromModal } from './listeners/views/createAbsenceFromModal.js';
import { deleteMessageFromModal } from './listeners/views/deleteMessageFromModal.js';
import { postSuggestionFromModal } from './listeners/views/postSuggestionFromModal.js';
import { ignoreRetry } from './middlewares/ignoreRetry.js';
const { App, ExpressReceiver, LogLevel } = slackBolt;

const expressReceiver = new ExpressReceiver({
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  processBeforeResponse: true,
});

expressReceiver.router.get('/', (req, res) => res.send('Hello world!'));
expressReceiver.router.post('/create-absence', createAbsence);

export const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  receiver: expressReceiver,
  logLevel: LogLevel.INFO,
});

app.use(ignoreRetry);

app.action(
  { type: 'block_actions', action_id: 'absence-new' },
  showCreateAbsenceModalFromSuggestion,
);
app.action(
  { type: 'block_actions', action_id: 'app-home-absence-delete' },
  deleteAbsenceFromAppHome,
);
app.action(
  { type: 'block_actions', action_id: 'absence-suggestion-yes' },
  createAbsenceFromSuggestion,
);

app.event('app_home_opened', appHomeOpened);
app.event('member_joined_channel', memberJoinedChannel);

app.shortcut(
  { callback_id: 'global_new_absence', type: 'shortcut' },
  showCreateAbsenceModalFromGlobalShortcut,
);
app.shortcut(
  { callback_id: 'message_new_suggestion', type: 'message_action' },
  showPostSuggestionModalFromMessageShortcut,
);
app.shortcut(
  { callback_id: 'message_delete', type: 'message_action' },
  showDeleteMessageModalFromMessageShortcut,
);

app.message(postSuggestionFromMessage);

app.view('new-absence-submit', createAbsenceFromModal);
app.view('new-suggestion-submit', postSuggestionFromModal);
app.view('delete-message-submit', deleteMessageFromModal);

app.error(async (error) => {
  console.error(error);
});

export const expressApp = expressReceiver.app;
