import type { BasicSlackEvent, EnvelopedEvent, SlackEvent } from '@slack/bolt';
import type { NextRequest } from 'next/server';
import { isRequestSignedBySlack } from '@/connectors/slack/utils';
import { inngest } from '@/inngest/client';

export const handleSlackWebhookMessage = async (request: NextRequest) => {
  const textBody = await request.clone().text();
  const timestamp = Number(request.headers.get('x-slack-request-timestamp'));
  const signature = request.headers.get('x-slack-signature');
  if (!timestamp || !signature || Number.isNaN(timestamp)) {
    throw new Error('Missing timestamp or signature');
  }

  // Deny replay attacks by accepting request from less than 5 minutes ago
  const fiveMinutesAgo = Math.floor(Date.now() / 1000) - 5 * 60;
  if (timestamp < fiveMinutesAgo) {
    throw new Error('Request timestamp too old');
  }

  const [signatureVersion, slackSignature] = signature.split('=');

  // Only handle known versions
  if (signatureVersion !== 'v0') {
    throw new Error(`Unhandled signature version: ${signatureVersion}`);
  }

  if (!slackSignature) {
    throw new Error('No signature provided');
  }

  const isSigned = await isRequestSignedBySlack(slackSignature, timestamp, textBody);
  if (!isSigned) {
    throw new Error('Failed to verify slack signature');
  }

  const payload = (await request.json()) as
    | EnvelopedEvent<SlackEvent>
    | (BasicSlackEvent<'url_verification'> & { challenge: string });

  if (payload.type === 'url_verification') {
    return { challenge: payload.challenge };
  }

  await inngest.send({
    id: `slack-event-${payload.event_id}`, // We set the id to ignore duplicate events
    name: 'slack/slack.webhook.event.received',
    data: {
      encrypted: payload,
    },
  });
};
