import slackBolt from '@slack/bolt';
import { createAbsence } from './handlers/createAbsence.js';
import { getCalendarEvents } from './handlers/getCalendarEvents.js';
import { getUsers } from './handlers/getUsers.js';
import { reportTodayAbsences } from './handlers/reportTodayAbsences.js';
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
import { checkAccessToken } from './middlewares/checkAccessToken.js';
import { cors } from './middlewares/cors.js';
import { ignoreRetry } from './middlewares/ignoreRetry.js';
const { App, ExpressReceiver } = slackBolt;

const expressReceiver = new ExpressReceiver({
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  processBeforeResponse: true,
});

expressReceiver.router.use(cors);
expressReceiver.router.get('/', (req, res) => res.send('Hello world!'));
expressReceiver.router.post('/report-today-absences', reportTodayAbsences);
expressReceiver.router.post('/create-absence', createAbsence);

expressReceiver.router.use('/events', checkAccessToken);
expressReceiver.router.get('/events', getCalendarEvents);

expressReceiver.router.use('/users', checkAccessToken);
expressReceiver.router.get('/users', getUsers);

export const slackApp = new App({
  token: process.env.SLACK_BOT_TOKEN,
  receiver: expressReceiver,
});

slackApp.use(ignoreRetry);

slackApp.action('absence-new', showCreateAbsenceModalFromSuggestion);
slackApp.action('app-home-absence-delete', deleteAbsenceFromAppHome);
slackApp.action('absence-suggestion-yes', createAbsenceFromSuggestion);

slackApp.event('app_home_opened', appHomeOpened);
slackApp.event('member_joined_channel', memberJoinedChannel);

slackApp.shortcut(
  'global_new_absence',
  showCreateAbsenceModalFromGlobalShortcut,
);
slackApp.shortcut(
  'message_new_suggestion',
  showPostSuggestionModalFromMessageShortcut,
);
slackApp.shortcut('message_delete', showDeleteMessageModalFromMessageShortcut);

slackApp.message(postSuggestionFromMessage);

slackApp.view('new-absence-submit', createAbsenceFromModal);
slackApp.view('new-suggestion-submit', postSuggestionFromModal);
slackApp.view('delete-message-submit', deleteMessageFromModal);

slackApp.error(async (error) => {
  console.error(error);
});

export const expressApp = expressReceiver.app;
