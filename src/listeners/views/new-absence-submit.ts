import { App } from '@slack/bolt';
import { addYears, startOfDay } from 'date-fns';
import { findMemberById, isWeekendInRange } from '../../helpers.js';
import { DayPart, Role } from '../../types.js';

export default function newAbsenceSubmit(app: App) {
  app.view('new-absence-submit', async ({ ack, body, view, logger }) => {
    const startDateString =
      view.state.values['start-date-block']['start-date-action'].selected_date;

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
    const reason =
      view.state.values['reason-block']['reason-action'].value || '';

    const isSingleMode = startDateString === endDateString;
    const startDate = new Date(startDateString);
    const endDate = new Date(endDateString);
    const today = startOfDay(new Date());

    const actionUserId = body.user.id;
    const actionUser = findMemberById(actionUserId);
    if (!actionUser) throw Error('action user not found');
    const actionUserName = actionUser.name;
    const isAdmin = actionUser.role === Role.ADMIN;

    const targetUserId =
      view.state.values?.['member-block']?.['member-action']?.selected_user ||
      actionUserId;

    let targetUser = actionUser;
    if (isAdmin) {
      if (!targetUserId) {
        await ack({
          response_action: 'errors',
          errors: {
            member_block: 'Member is required',
          },
        });
        return;
      }
      const foundUser = findMemberById(targetUserId);
      if (!foundUser) throw Error('target user not found');
      targetUser = foundUser;
    }
    const targetUserName = targetUser.name;
    if (!isAdmin && actionUser.id === targetUser.id) {
      logger.info(`${actionUserName} is submiting absence`);
    } else {
      logger.info(
        `admin ${actionUserName} is submiting absence for ${targetUserName}`,
      );
    }

    if (!isAdmin && startDate < today) {
      await ack({
        response_action: 'errors',
        errors: {
          'start-date-block': 'Not allow day in the past',
        },
      });
      return;
    }

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

    if (startDate > addYears(today, 1)) {
      await ack({
        response_action: 'errors',
        errors: {
          'start-date-block': 'Must not be later than 1 year from now',
        },
      });
      return;
    }

    if (endDate > addYears(today, 1)) {
      await ack({
        response_action: 'errors',
        errors: {
          'end-date-block': 'Must not be later than 1 year from now',
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

    await ack({ response_action: 'clear' });

    const messageText = reason ? ` Reason: ${reason}` : '';

    fetch(`${process.env.API_ENDPOINT}/absences`, {
      method: 'POST',
      body: new URLSearchParams({
        actionUserId,
        targetUserId,
        startDateString,
        endDateString,
        dayPart,
        messageText,
      }),
    });
  });
}
