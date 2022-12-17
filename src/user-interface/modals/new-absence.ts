import { KnownBlock, Option, View } from '@slack/bolt';
import { format } from 'date-fns';
import { findMemberById } from '../../helpers';
import { DayPart, Role } from '../../types';

export default function newAbsenceModal(userId: string): View {
  const foundMember = findMemberById(userId)!;
  const isAdmin = foundMember.role === Role.ADMIN;

  const dayPartOptions: Option[] = [
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
  ];

  return {
    type: 'modal',
    callback_id: 'new-absence-submit',
    // notify_on_close: true,
    // private_metadata: privateMetadata,
    title: {
      type: 'plain_text',
      text: 'Absence registration',
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
      ...(isAdmin
        ? [
            {
              type: 'input',
              block_id: 'member-block',
              element: {
                type: 'users_select',
                placeholder: {
                  type: 'plain_text',
                  text: 'Select a member',
                  emoji: true,
                },
                initial_user: userId,
                action_id: 'member-action',
              },
              label: {
                type: 'plain_text',
                text: 'Assign to',
                emoji: true,
              },
            } as KnownBlock,
          ]
        : []),
      {
        type: 'input',
        block_id: 'start-date-block',
        element: {
          type: 'datepicker',
          initial_date: format(new Date(), 'yyyy-MM-dd'),
          action_id: 'start-date-action',
          focus_on_load: true,
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
          initial_option: dayPartOptions[0],
          options: dayPartOptions,
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
          placeholder: {
            type: 'plain_text',
            text: 'Share your reason',
            emoji: true,
          },
        },
        label: {
          type: 'plain_text',
          text: 'Reason',
          emoji: true,
        },
      },
    ],
  };
}
