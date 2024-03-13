import type { ResourceIds, SubscribeData, WebhookPayload } from '@/app/api/webhook/types';
import { inngest } from '@/inngest/client';

const getResourceType = (resource: string) => {
  if (resource.includes('replies')) {
    return 'reply';
  }
  if (resource.includes('messages')) {
    return 'message';
  }
  if (resource.includes('channels')) {
    return 'channel';
  }
};

export const handleWebhook = async (data: SubscribeData) => {
  const webhookPayloads: WebhookPayload[] = data.value.map((subscribe) => {
    const {
      teams: teamId,
      channels: channelId,
      messages: messageId,
      replies: replyId,
    }: ResourceIds = subscribe.resource.split('/').reduce((acc, part) => {
      const [, value] = /\('(?<value>[^']+)'\)/.exec(part) || [];
      if (value) {
        const key = part.split('(')[0];
        if (key) {
          acc[key] = value;
        }
      }
      return acc;
    }, {});

    return {
      teamId,
      channelId,
      messageId,
      replyId,
      subscriptionId: subscribe.subscriptionId,
      event: `${getResourceType(subscribe.resource)}_${subscribe.changeType}`,
      tenantId: subscribe.tenantId,
    };
  });

  await inngest.send(
    webhookPayloads.map((payload) => ({
      id: `team-event-${payload.subscriptionId}`,
      name: 'teams/teams.webhook.event.received',
      data: {
        payload,
      },
    }))
  );
};
