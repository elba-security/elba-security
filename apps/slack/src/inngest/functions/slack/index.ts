import {
  handleSlackWebhookEvent,
  type HandleSlackWebhookEventEvents,
} from './handle-slack-webhook-event';

export type SlackEvents = HandleSlackWebhookEventEvents;

export const slackFunctions = [handleSlackWebhookEvent];
