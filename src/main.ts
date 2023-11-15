import slackBolt from '@slack/bolt';
import absenceNew from './listeners/actions/absence-new.js';
import absenceSuggestionYes from './listeners/actions/absence-suggestion-yes.js';
import appHomeAbsenceDelete from './listeners/actions/app-home-absence-delete.js';
import appHomeOpened from './listeners/events/app-home-opened.js';
import memberJoinedChannel from './listeners/events/member-joined-channel.js';
import messages from './listeners/events/messages.js';
const { App, ExpressReceiver, LogLevel } = slackBolt;
// import suggestAbsence from './listeners/messages/absence-suggest.js';
import globalNewAbsence from './listeners/shortcuts/global-new-absence.js';
import messageDelete from './listeners/shortcuts/message-delete.js';
import messageNewSuggestion from './listeners/shortcuts/message-new-suggestion.js';
import deleteMessageSubmit from './listeners/views/delete-message-submit.js';
import newAbsenceSubmit from './listeners/views/new-absence-submit.js';
import newSuggestionSubmit from './listeners/views/new-suggestion-submit.js';
import retryIgnore from './middlewares/retry-ignore.js';

// https://cloud.google.com/functions/docs/configuring/env-var#newer_runtimes
const isOnGoogleCloud = Boolean(
  process.env.K_SERVICE && process.env.K_REVISION,
);

const expressReceiver = new ExpressReceiver({
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  processBeforeResponse: isOnGoogleCloud,
});

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  receiver: expressReceiver,
  processBeforeResponse: isOnGoogleCloud,
  logLevel: LogLevel.INFO,
});

app.use(retryIgnore);

// actions
absenceNew(app);
appHomeAbsenceDelete(app);
absenceSuggestionYes(app);

// events
appHomeOpened(app);
memberJoinedChannel(app);
messages(app);

// shortcuts
globalNewAbsence(app);
messageNewSuggestion(app);
messageDelete(app);

// messages
// suggestAbsence(app);

// views
newAbsenceSubmit(app);
newSuggestionSubmit(app);
deleteMessageSubmit(app);

// Check the details of the error to handle cases where you should retry sending a message or stop the app
app.error(async (error) => {
  console.error(error);
});

export const expressApp = expressReceiver.app;
