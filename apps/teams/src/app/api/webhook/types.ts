export type SubscriptionPayload = {
  subscriptionId: string;
  changeType: 'created' | 'updated' | 'deleted';
  resource: string;
  tenantId: string;
};

export type SubscribeData = {
  value: SubscriptionPayload[];
};

export type ResourceIds = {
  teams: string;
  channels: string;
  messages?: string;
  replies?: string;
};

export enum EventType {
  ChannelCreated = 'channel_created',
  ChannelDeleted = 'channel_deleted',
  MessageCreated = 'message_created',
  ReplyCreated = 'reply_created',
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
