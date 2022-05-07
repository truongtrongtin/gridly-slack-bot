/* eslint-disable no-console */
import { App, ExpressReceiver, LogLevel } from '@slack/bolt';
import 'dotenv/config';
import appHomeAbsenceDelete from './listeners/actions/app-home-absence-delete';
import appHomeNewAbsence from './listeners/actions/app-home-new-absence';
import appHomeRefresh from './listeners/actions/app-home-refresh';
import appHomeOpened from './listeners/events/app-home-opened';
import globalNewAbsence from './listeners/shortcuts/global-new-absence';
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
appHomeRefresh(app);
appHomeAbsenceDelete(app);

// events
appHomeNewAbsence(app);

// shortcuts
globalNewAbsence(app);

// views
newAbsenceSubmit(app);

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

module.exports.app = function (req: any, res: any) {
  // console.log(`Request header: ${JSON.stringify(req.headers)}`);
  // if (req.rawBody) {
  //   console.log(`Request body: ${req.rawBody}`);
  // }
  expressApp(req, res);
};
