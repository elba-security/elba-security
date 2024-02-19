import { EventSchemas } from 'inngest';
import {
  ElbaInngest,
  sentryMiddleware,
  unauthorizedMiddleware,
  rateLimitMiddleware,
} from '@elba-security/app-core/inngest';
import { logger } from '@elba-security/logger';
import { getErrorRetryAfter, isUnauthorizedError } from '@/connectors/microsoft/commons/error';
import { db, dbSchema } from '@/database/client';

export const inngest = new ElbaInngest({
  id: 'microsoft',
  db,
  dbSchema,
  schemas: new EventSchemas().fromRecord<{
    'microsoft/third_party_apps.revoke_app_permission.requested': {
      data: {
        organisationId: string;
        appId: string;
        permissionId: string;
      };
    };
    'microsoft/third_party_apps.refresh_app_permission.requested': {
      data: {
        organisationId: string;
        appId: string;
        userId: string;
      };
    };
    'microsoft/token.refresh.requested': {
      data: {
        organisationId: string;
        expiresAt: number;
      };
    };
  }>(),
  middleware: [
    rateLimitMiddleware({
      getErrorRetryAfter,
    }),
    unauthorizedMiddleware({
      isUnauthorizedError,
    }),
    sentryMiddleware,
  ],
  logger,
});
