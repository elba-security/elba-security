import { EventSchemas, Inngest } from 'inngest';
import { sentryMiddleware } from '@elba-security/inngest';
import { logger } from '@elba-security/logger';
import { rateLimitMiddleware } from './middlewares/rate-limit-middleware';

export const inngest = new Inngest({
  id: 'teams',
  schemas: new EventSchemas().fromRecord<{
    'teams/teams.elba_app.installed': {
      data: {
        organisationId: string;
      };
    };
    'teams/token.refresh.triggered': {
      data: {
        organisationId: string;
        expiresIn: number;
      };
    };
    'teams/users.sync.triggered': {
      data: {
        organisationId: string;
        isFirstSync: boolean;
        syncStartedAt: number;
        skipToken: string | null;
      };
    };
    'teams/teams.sync.triggered': {
      data: {
        organisationId: string;
        skipToken: string | null;
      };
    };
    'teams/channels.sync.triggered': {
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
    'teams/messages.sync.triggered': {
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
    'teams/replies.sync.triggered': {
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
  }>(),
  middleware: [rateLimitMiddleware, sentryMiddleware],
  logger,
});
