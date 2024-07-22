import { z } from 'zod';
import { inngest } from '@/inngest/client';
import type { MicrosoftEventHandlerPayload } from '@/app/api/webhooks/microsoft/event-handler/types';

export enum EventType {
  ChannelCreated = 'channel_created',
  ChannelDeleted = 'channel_deleted',
  MessageCreated = 'message_created',
  MessageUpdated = 'message_updated',
  MessageDeleted = 'message_deleted',
  ReplyCreated = 'reply_created',
  ReplyUpdated = 'reply_updated',
  ReplyDeleted = 'reply_deleted',
}

export type WebhookPayload = {
  teamId: string;
  channelId: string;
  messageId?: string;
  replyId?: string;
  subscriptionId: string;
  event: EventType;
  tenantId: string;
};

const getResourceType = (resource: string) => {
  if (resource.includes('replies')) {
    return 'reply';
  }
  if (resource.includes('messages')) {
    return 'message';
  }
  return 'channel';
};

const resourceIdsSchema = z.object({
  teams: z.string(),
  channels: z.string(),
  messages: z.optional(z.string()),
  replies: z.optional(z.string()),
});

const getResources = (str: string): object => {
  return str.split('/').reduce((acc, part) => {
    const [, value] = /\('(?<value>[^']+)'\)/.exec(part) || [];
    if (value) {
      const key = part.split('(')[0];
      if (key) {
        acc[key] = value;
      }
    }
    return acc;
  }, {});
};

const groupResources = (data: MicrosoftEventHandlerPayload['value']) => {
  return data.reduce((acum, event) => {
    const resources = getResources(event.resource);
    const resultResourcesParse = resourceIdsSchema.safeParse(resources);

    if (!resultResourcesParse.success) {
      return acum;
    }

    return [
      ...acum,
      {
        ...event,
        resources: resultResourcesParse.data,
        eventName: `${getResourceType(event.resource)}_${event.changeType}`,
      },
    ];
  }, []);
};

export const handleWebhook = async (data: MicrosoftEventHandlerPayload['value']) => {
  if (!data.length) {
    return;
  }

  const webhookPayloads: WebhookPayload[] = groupResources(data)
    .filter((event) => {
      return Object.values(EventType).includes(event.eventName as EventType);
    })
    .map((event) => ({
      teamId: event.resources.teams,
      channelId: event.resources.channels,
      messageId: event.resources.messages,
      replyId: event.resources.replies,
      subscriptionId: event.subscriptionId,
      event: event.eventName as EventType,
      tenantId: event.tenantId,
    }));

  if (!webhookPayloads.length) {
    return;
  }

  await inngest.send(
    webhookPayloads.map((payload) => ({
      name: 'teams/teams.webhook.event.received',
      data: {
        payload,
      },
    }))
  );
};
