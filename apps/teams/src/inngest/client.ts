import { EventSchemas, type GetEvents, type GetFunctionInput, Inngest } from 'inngest';
import { sentryMiddleware } from '@elba-security/inngest';
import { logger } from '@elba-security/logger';
import type { WebhookPayload } from '@/app/api/webhooks/microsoft/event-handler/service';
import type { MessageMetadata } from '@/connectors/elba/data-protection/metadata';
import { rateLimitMiddleware } from './middlewares/rate-limit-middleware';

type InngestClient = typeof inngest;

export type GetInngestFunctionInput<T extends keyof GetEvents<InngestClient>> = GetFunctionInput<
  InngestClient,
  T
>;

export const inngest = new Inngest({
  id: 'teams',
  schemas: new EventSchemas().fromRecord<{
    'teams/app.installed': {
      data: {
        organisationId: string;
      };
    };
    'teams/token.refresh.requested': {
      data: {
        organisationId: string;
        expiresAt: number;
      };
    };
    'teams/users.sync.requested': {
      data: {
        organisationId: string;
        isFirstSync: boolean;
        syncStartedAt: number;
        skipToken: string | null;
      };
    };
    'teams/teams.sync.requested': {
      data: {
        organisationId: string;
        skipToken: string | null;
        syncStartedAt: string;
        isFirstSync: boolean;
      };
    };
    'teams/channels.sync.requested': {
      data: {
        organisationId: string;
        teamId: string;
      };
    };
    'teams/channels.sync.completed': {
      data: {
        organisationId: string;
        teamId: string;
      };
    };
    'teams/messages.sync.requested': {
      data: {
        organisationId: string;
        skipToken?: string | null;
        teamId: string;
        channelId: string;
        channelName: string;
        membershipType: string;
      };
    };
    'teams/messages.sync.completed': {
      data: {
        organisationId: string;
        channelId: string;
      };
    };
    'teams/replies.sync.requested': {
      data: {
        organisationId: string;
        skipToken?: string | null;
        teamId: string;
        channelId: string;
        messageId: string;
        channelName: string;
        membershipType: string;
      };
    };
    'teams/replies.sync.completed': {
      data: {
        organisationId: string;
        messageId: string;
      };
    };
    'teams/channels.subscription.requested': {
      data: {
        organisationId: string;
      };
    };
    'teams/channel.subscription.requested': {
      data: {
        teamId: string;
        channelId: string;
        organisationId: string;
        uniqueChannelInOrganisationId: string;
      };
    };
    'teams/teams.webhook.event.received': {
      data: {
        payload: WebhookPayload;
      };
    };
    'teams/subscription.refresh.requested': {
      data: {
        subscriptionId: string;
        organisationId: string;
      };
    };
    'teams/data_protection.refresh_object.requested': {
      data: {
        organisationId: string;
        metadata: MessageMetadata;
      };
    };
    'teams/app.uninstalled': {
      data: {
        organisationId: string;
      };
    };
    'teams/subscriptions.start-recreate.requested': {
      data: Record<string, never>;
    };
    'teams/subscriptions.recreate.requested': {
      data: {
        organisationId: string;
      };
    };
  }>(),
  middleware: [rateLimitMiddleware, sentryMiddleware],
  logger,
});
