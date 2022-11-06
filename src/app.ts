import { App, ExpressReceiver, LogLevel } from '@slack/bolt';
import { Request, Response } from 'express';
import absenceSuggestionYes from './listeners/actions/absence-suggestion-yes';
import appHomeAbsenceDelete from './listeners/actions/app-home-absence-delete';
import absenceNew from './listeners/actions/absence-new';
import appHomeOpened from './listeners/events/app-home-opened';
import messages from './listeners/events/messages';
// import suggestAbsence from './listeners/messages/absence-suggest';
import globalNewAbsence from './listeners/shortcuts/global-new-absence';
import viewMessageHistory from './listeners/shortcuts/view-message-history.ts';
import adminNewAbsenceSubmit from './listeners/views/admin-new-absence-submit';
import newAbsenceSubmit from './listeners/views/new-absence-submit';

const expressReceiver = new ExpressReceiver({
  signingSecret: process.env.SLACK_SIGNING_SECRET!,
});

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  receiver: expressReceiver,
  logLevel: LogLevel.INFO,
});

const expressApp = expressReceiver.app;

// actions
appHomeOpened(app);
appHomeAbsenceDelete(app);
absenceSuggestionYes(app);

// events
absenceNew(app);
messages(app);

// shortcuts
globalNewAbsence(app);
viewMessageHistory(app);

// messages
// suggestAbsence(app);

// views
newAbsenceSubmit(app);
adminNewAbsenceSubmit(app);

// Check the details of the error to handle cases where you should retry sending a message or stop the app
app.error(async (error) => {
  console.error(error);
});

function isOnGoogleCloud() {
  // https://cloud.google.com/functions/docs/configuring/env-var#newer_runtimes
  return process.env.K_SERVICE && process.env.K_REVISION;
}

if (!isOnGoogleCloud()) {
  // Running on your local machine
  (async () => {
    // Start your app
    expressApp.listen(Number(process.env.PORT) || 3001);
    console.log('⚡️ Bolt app is running!');
  })();
}

exports.app = function (req: Request, res: Response) {
  // console.log(`Request header: ${JSON.stringify(req.headers)}`);
  // if (req.rawBody) {
  //   console.log(`Request body: ${req.rawBody}`);
  // }
  expressApp(req, res);
};
