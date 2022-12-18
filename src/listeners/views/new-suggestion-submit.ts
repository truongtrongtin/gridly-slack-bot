import { App } from '@slack/bolt';
import { addMonths, startOfDay } from 'date-fns';
import {
  findMemberById,
  generateTimeText,
  isWeekendInRange,
} from '../../helpers';
import { DayPart } from '../../types';

export default function newSuggestionSubmit(app: App) {
  app.view(
    'new-suggestion-submit',
    async ({ ack, body, view, client, logger }) => {
      const startDateString =
        view.state.values['start-date-block']['start-date-action']
          .selected_date;

      if (!startDateString) {
        await ack({
          response_action: 'errors',
          errors: {
            'start-date-block': 'Start date is required',
          },
        });
        return;
      }

      const endDateString =
        view.state.values['end-date-block']['end-date-action'].selected_date ||
        startDateString;
      const dayPart = view.state.values['day-part-block']['day-part-action']
        .selected_option?.value as DayPart;

      const { targetUserId, messageText, messageTs } = JSON.parse(
        view.private_metadata,
      );
      const isSingleMode = startDateString === endDateString;
      const startDate = new Date(startDateString);
      const endDate = new Date(endDateString);
      const today = startOfDay(new Date());

      const actionUserId = body.user.id;
      const actionUser = findMemberById(actionUserId);
      if (!actionUser) throw Error('action user not found');
      const actionUserName = actionUser.names[0];

      const targetUser = findMemberById(targetUserId);
      if (!targetUser) throw Error('member not found');
      const targetUserName = targetUser.names[0];

      logger.info(
        `admin ${actionUserName} is submiting suggestion for ${targetUserName}`,
      );

      if (isWeekendInRange(startDate, endDate)) {
        if (isSingleMode) {
          await ack({
            response_action: 'errors',
            errors: {
              'start-date-block': 'Not allow weekend',
            },
          });
        } else {
          await ack({
            response_action: 'errors',
            errors: {
              'start-date-block': 'Not allow weekend in range',
              'end-date-block': 'Not allow weekend in range',
            },
          });
        }
        return;
      }

      if (endDate < startDate) {
        await ack({
          response_action: 'errors',
          errors: {
            'end-date-block': 'Must not be earlier than start date',
          },
        });
        return;
      }

      if (startDate > addMonths(today, 3)) {
        await ack({
          response_action: 'errors',
          errors: {
            'start-date-block': 'Must not be later than 3 months from now',
          },
        });
        return;
      }

      if (endDate > addMonths(today, 3)) {
        await ack({
          response_action: 'errors',
          errors: {
            'end-date-block': 'Must not be later than 3 months from now',
          },
        });
        return;
      }

      if (!isSingleMode && dayPart !== DayPart.ALL) {
        await ack({
          response_action: 'errors',
          errors: {
            'day-part-block': 'This option is not supported in multi-date mode',
          },
        });
        return;
      }

      await ack();

      try {
        const timeText = generateTimeText(startDate, endDate, dayPart);
        const text = `<@${targetUser.id}>, are you going to be absent *${timeText}*?`;
        const quote = messageText
          .split('\n')
          .map((text: string) => `>${text}`)
          .join('\n');
        await client.chat.postMessage({
          channel: process.env.SLACK_CHANNEL!,
          thread_ts: messageTs,
          blocks: [
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: `${quote}\n${text}`,
                verbatim: true,
              },
            },
            {
              type: 'actions',
              elements: [
                {
                  type: 'button',
                  action_id: 'absence-suggestion-yes',
                  text: {
                    type: 'plain_text',
                    emoji: true,
                    text: 'Yes',
                  },
                  style: 'primary',
                  value: JSON.stringify({
                    startDateString,
                    endDateString,
                    dayPart,
                    messageText,
                    targetUserId,
                  }),
                  confirm: {
                    title: {
                      type: 'plain_text',
                      text: 'Absence confirm',
                      emoji: true,
                    },
                    text: {
                      type: 'mrkdwn',
                      text: `Do you confirm to be absent ${timeText}?\n The submission will take some time, please be patient.`,
                      verbatim: true,
                    },
                    confirm: {
                      type: 'plain_text',
                      text: 'Confirm',
                      emoji: true,
                    },
                  },
                },
                {
                  type: 'button',
                  action_id: 'absence-new',
                  text: {
                    type: 'plain_text',
                    emoji: true,
                    text: 'No, submit myself',
                  },
                },
              ],
            },
          ],
          text,
        });
      } catch (error) {
        if (error instanceof Error) {
          logger.error(error.message);
        }
      }
    },
  );
}
