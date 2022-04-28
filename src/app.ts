/* eslint-disable no-console */
import 'dotenv/config';
import { App, ExpressReceiver, LogLevel } from '@slack/bolt';
import { capitalize, isGenericMessageEvent } from './helpers';
import axios from 'axios';

enum DayPart {
  ALL = 'all',
  MORNING = 'morning',
  AFTERNOON = 'afternoon',
}

const members = [
  { email: 'cm@localizedirect.com', possibleNames: ['chau'] },
  { email: 'dng@localizedirect.com', possibleNames: ['duong'] },
  { email: 'dp@localizedirect.com', possibleNames: ['dung'] },
  { email: 'gn@localizedirect.com', possibleNames: ['giang'] },
  {
    email: 'hh@localizedirect.com',
    possibleNames: ['hieu huynh', 'hieu h', 'hieu h.'],
  },
  { email: 'hm@localizedirect.com', possibleNames: ['huong'] },
  {
    email: 'kp@localizedirect.com',
    possibleNames: ['khanh', 'khanh p', 'khanh ph'],
  },
  { email: 'ld@localizedirect.com', possibleNames: ['lynh'] },
  { email: 'ldv@localizedirect.com', possibleNames: ['long'] },
  { email: 'nn@localizedirect.com', possibleNames: ['nha', 'andy'] },
  { email: 'nnc@localizedirect.com', possibleNames: ['cuong', 'jason'] },
  { email: 'pia@localizedirect.com', possibleNames: ['pia', 'huyen'] },
  { email: 'pv@localizedirect.com', possibleNames: ['phu'] },
  { email: 'qv@localizedirect.com', possibleNames: ['quang'] },
  { email: 'sn@localizedirect.com', possibleNames: ['sang'] },
  {
    email: 'tc@localizedirect.com',
    possibleNames: ['tri truong', 'tri t.', 'steve'],
  },
  { email: 'th@localizedirect.com', possibleNames: ['tan'] },
  { email: 'tin@localizedirect.com', possibleNames: ['tin'] },
  { email: 'tlv@localizedirect.com', possibleNames: ['win'] },
  { email: 'tn@localizedirect.com', possibleNames: ['truong'] },
  { email: 'tnn@localizedirect.com', possibleNames: ['thy'] },
  { email: 'vtl@localizedirect.com', possibleNames: ['trong'] },
  { email: 'truongtrongtin0305@gmail.com', possibleNames: ['tin'] },
];

const expressReceiver = new ExpressReceiver({
  signingSecret: process.env.SLACK_SIGNING_SECRET!,
});

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  receiver: expressReceiver,
  logLevel: LogLevel.DEBUG,
});

const expressApp = expressReceiver.app;

// Listens to incoming messages that contain "hello"
app.message('hello', async ({ message, say }) => {
  // Filter out message events with subtypes (see https://api.slack.com/events/message)
  // Is there a way to do this in listener middleware with current type system?
  if (!isGenericMessageEvent(message)) return;

  // say() sends a message to the channel where the event was triggered
  await say({
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `Hey there <@${message.user}>!`,
        },
        accessory: {
          type: 'button',
          text: {
            type: 'plain_text',
            text: 'Click Me',
          },
          action_id: 'button_click',
        },
      },
    ],
    text: `Hey there <@${message.user}>!`,
  });
});

app.action('button_click', async ({ body, ack, say }) => {
  // Acknowledge the action
  await ack();
  await say(`<@${body.user.id}> clicked the button`);
});

app.shortcut('register_absences', async ({ shortcut, ack, client, logger }) => {
  try {
    // Acknowledge shortcut request
    await ack();

    // Call the views.open method using one of the built-in WebClients
    const result = await client.views.open({
      trigger_id: shortcut.trigger_id,
      view: {
        type: 'modal',
        callback_id: 'modal-callback-id',
        // private_metadata: privateMetadata,
        title: {
          type: 'plain_text',
          text: 'Register absences',
        },
        submit: {
          type: 'plain_text',
          text: 'Submit',
          emoji: true,
        },
        close: {
          type: 'plain_text',
          text: 'Cancel',
          emoji: true,
        },
        blocks: [
          {
            type: 'input',
            block_id: 'start-date-block',
            element: {
              type: 'datepicker',
              initial_date: new Date().toISOString().split('T')[0],
              action_id: 'start-date-action',
            },
            label: {
              type: 'plain_text',
              text: 'Start date',
              emoji: true,
            },
          },
          {
            type: 'input',
            block_id: 'end-date-block',
            optional: true,
            element: {
              type: 'datepicker',
              action_id: 'end-date-action',
            },
            label: {
              type: 'plain_text',
              text: 'End date',
              emoji: true,
            },
          },
          {
            type: 'input',
            block_id: 'day-part-block',
            element: {
              type: 'radio_buttons',
              initial_option: {
                text: {
                  type: 'plain_text',
                  text: ':beach_with_umbrella: All day',
                  emoji: true,
                },
                value: 'all',
              },
              options: [
                {
                  text: {
                    type: 'plain_text',
                    text: ':beach_with_umbrella: All day',
                    emoji: true,
                  },
                  value: DayPart.ALL,
                },
                {
                  text: {
                    type: 'plain_text',
                    text: `:sunny: Morning`,
                    emoji: true,
                  },
                  value: DayPart.MORNING,
                },
                {
                  text: {
                    type: 'plain_text',
                    text: ':city_sunset: Afternoon',
                    emoji: true,
                  },
                  value: DayPart.AFTERNOON,
                },
              ],
              action_id: 'day-part-action',
            },
            label: {
              type: 'plain_text',
              text: 'Day part',
              emoji: true,
            },
          },
          {
            type: 'input',
            block_id: 'reason-block',
            optional: true,

            element: {
              type: 'plain_text_input',
              action_id: 'reason-action',
            },
            label: {
              type: 'plain_text',
              text: 'Reason',
              emoji: true,
            },
          },
        ],
      },
    });

    logger.info(result);
  } catch (error) {
    logger.error(error);
  }
});

// Handle a view_submission request
app.view('modal-callback-id', async ({ ack, body, view, client, logger }) => {
  const startDate =
    view['state']['values']['start-date-block']['start-date-action']
      .selected_date;
  const endDate =
    view['state']['values']['end-date-block']['end-date-action'].selected_date;
  const dayPart =
    view['state']['values']['day-part-block']['day-part-action'].selected_option
      ?.value;
  const reason = view['state']['values']['reason-block']['reason-action'].value;

  if (!startDate) {
    await ack({
      response_action: 'errors',
      errors: {
        'start-date-block': 'Start date is required',
      },
    });
    return;
  }

  if (
    new Date(startDate).setHours(0, 0, 0, 0) < new Date().setHours(0, 0, 0, 0)
  ) {
    await ack({
      response_action: 'errors',
      errors: {
        'start-date-block': 'You may not select a due date in the past',
      },
    });
    return;
  }

  if (endDate) {
    if (
      new Date(startDate).setHours(0, 0, 0, 0) >
      new Date(endDate).setHours(0, 0, 0, 0)
    ) {
      await ack({
        response_action: 'errors',
        errors: {
          'end-date-block': 'End date must be greater than start date',
        },
      });
      return;
    }

    const diffDays = Math.ceil(
      (new Date(endDate).getTime() - new Date(startDate).getTime()) /
        (24 * 60 * 60 * 1000),
    );

    console.log('diffDays', diffDays);

    if (diffDays !== 0 && dayPart !== DayPart.ALL) {
      await ack({
        response_action: 'errors',
        errors: {
          'day-part-block': 'This option is not supported in multi-date mode',
        },
      });
      return;
    }
  }

  await ack();

  try {
    const user = body['user']['id'];
    // Get slack message 's author info
    const slackUserInfo = await client.users.info({ user });
    const slackEmail = slackUserInfo?.user?.profile?.email;

    // Get new google access token from refresh token
    const tokenResponse = await axios.post(
      'https://oauth2.googleapis.com/token',
      {
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        grant_type: 'refresh_token',
        refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
      },
    );
    const accessToken: string = tokenResponse.data.access_token;

    const foundMember = members.find((member) => member.email === slackEmail);
    const memberName = foundMember
      ? capitalize(foundMember.possibleNames[0])
      : '';
    const offText = dayPart === DayPart.ALL ? '(off)' : `(off ${dayPart})`;
    const dayAfterEndDate = new Date(endDate || startDate);
    dayAfterEndDate.setDate(dayAfterEndDate.getDate() + 1);

    // Create new event on google calendar
    const newEventResponse = await axios.post(
      `https://www.googleapis.com/calendar/v3/calendars/${process.env.GOOGLE_CALENDAR_ID}/events`,
      {
        start: {
          date: startDate,
        },
        end: {
          date: dayAfterEndDate.toISOString().split('T')[0],
        },
        summary: `${memberName || slackEmail} ${offText}`,
        description: reason,
      },
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );

    await client.chat.postMessage({
      channel: 'C03DFLTDSRL',
      text: 'hehehe',
    });
  } catch (error) {
    logger.error(error);
  }
});

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
  console.log(`Request header: ${JSON.stringify(req.headers)}`);
  if (req.rawBody) {
    console.log(`Request body: ${req.rawBody}`);
  }
  expressApp(req, res);
};
