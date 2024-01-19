import type { EnvelopedEvent, SlackEvent } from '@slack/bolt';
import { inngest } from '@/inngest/client';
import { slackEventHandler } from './event-handlers';

const handleSlackWebhookEventEventName = 'slack/webhook.handle';

export type HandleSlackWebhookEventEventName = typeof handleSlackWebhookEventEventName;

export type HandleSlackWebhookEventEvents = {
  [handleSlackWebhookEventEventName]: SlackWebhookHandler;
};

export type SlackWebhookHandler = {
  data: EnvelopedEvent<SlackEvent>;
};

export const handleSlackWebhookEvent = inngest.createFunction(
  { id: 'handle-slack-webhook-event', retries: 5 },
  { event: handleSlackWebhookEventEventName },
  slackEventHandler
);
