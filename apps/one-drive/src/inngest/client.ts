import { EventSchemas, Inngest } from 'inngest';
import { sentryMiddleware } from '@elba-security/inngest';
import { logger } from '@elba-security/logger';
import { rateLimitMiddleware } from './middlewares/rate-limit-middleware';
import { unauthorizedMiddleware } from './middlewares/unauthorized-middleware';

export const inngest = new Inngest({
  id: 'one-drive',
  schemas: new EventSchemas().fromRecord<{
    'one-drive/users.sync.triggered': {
      data: {
        organisationId: string;
        isFirstSync: boolean;
        syncStartedAt: number;
        skipToken: string | null;
      };
    };
    'one-drive/one-drive.elba_app.installed': {
      data: {
        organisationId: string;
      };
    };
    'one-drive/one-drive.elba_app.uninstalled': {
      data: {
        organisationId: string;
      };
    };
    'one-drive/token.refresh.requested': {
      data: {
        organisationId: string;
        expiresAt: number;
      };
    };
    'one-drive/data_protection.sync.requested': {
      data: {
        organisationId: string;
        syncStartedAt: number;
        isFirstSync: boolean;
        skipToken: string | null;
      };
    };
    'one-drive/drives.sync.triggered': {
      data: {
        siteId: string;
        organisationId: string;
        isFirstSync: boolean;
        skipToken: string | null;
      };
    };
    'one-drive/items.sync.triggered': {
      data: {
        siteId: string;
        driveId: string;
        organisationId: string;
        isFirstSync: boolean;
        folderId: string | null;
        skipToken: string | null;
      };
    };
    'one-drive/drives.sync.completed': {
      data: {
        organisationId: string;
        siteId: string;
      };
    };
    'one-drive/items.sync.completed': {
      data: {
        organisationId: string;
        driveId: string;
      };
    };
    'one-drive/foder-items.sync.completed': {
      data: {
        organisationId: string;
        folderId: string;
      };
    };
  }>(),
  middleware: [rateLimitMiddleware, unauthorizedMiddleware, sentryMiddleware],
  logger,
});
