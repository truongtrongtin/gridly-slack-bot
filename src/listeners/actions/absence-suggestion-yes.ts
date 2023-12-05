import { App, ButtonAction } from '@slack/bolt';

export default function absenceSuggestionYes(app: App) {
  app.action(
    { type: 'block_actions', action_id: 'absence-suggestion-yes' },
    async ({ ack, payload, body }) => {
      await ack();
      fetch(`${process.env.API_ENDPOINT}/absences`, {
        method: 'POST',
        body: new URLSearchParams({
          ...JSON.parse((<ButtonAction>payload).value),
          actionUserId: body.user.id,
        }),
      });
    },
  );
}
