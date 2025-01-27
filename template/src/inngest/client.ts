import { EventSchemas, Inngest } from 'inngest';
import { logger } from '@elba-security/logger';
import { type ConnectionErrorType } from '@elba-security/sdk';
import { rateLimitMiddleware } from './middlewares/rate-limit-middleware';
import { elbaConnectionErrorMiddleware } from './middlewares/elba-connection-error-middleware';

/**
 * Inngest client configuration for handling asynchronous events in the integration.
 * The client is configured with:
 *
 * 1. Event Schemas:
 *    - app.installed: Triggered when the integration is successfully installed
 *    - app.uninstalled: Triggered when the integration encounters a fatal error
 *    - users.sync.requested: Triggered to start user synchronization
 *
 * 2. Middleware:
 *    - rateLimitMiddleware: Handles rate limiting (429) responses
 *    - elbaConnectionErrorMiddleware: Maps errors to Elba connection states
 *
 * 3. Logging:
 *    - Uses the Elba logger for consistent log formatting
 *
 * Events are namespaced using the integration name from package.json:
 * Example for "@elba-security/bitbucket":
 * - bitbucket/app.installed
 * - bitbucket/app.uninstalled
 * - bitbucket/users.sync.requested
 */

export const inngest = new Inngest({
  id: '{{name}}',
  schemas: new EventSchemas().fromRecord<{
    '{{name}}/app.installed': {
      data: { organisationId: string };
    };
    '{{name}}/app.uninstalled': {
      data: {
        organisationId: string;
        region: string;
        errorType: ConnectionErrorType;
        errorMetadata?: unknown;
      };
    };
    '{{name}}/users.sync.requested': {
      data: {
        organisationId: string;
        region: string;
        nangoConnectionId: string;
        isFirstSync: boolean;
        syncStartedAt: number;
        page: string | null;
      };
    };
  }>(),
  middleware: [rateLimitMiddleware, elbaConnectionErrorMiddleware],
  logger,
});
