import { createElbaConnectionErrorMiddleware } from '@elba-security/inngest';
import { mapElbaConnectionError } from '@/connectors/common/error';

/**
 * Middleware for handling Elba connection errors in Inngest functions.
 * This middleware:
 * 1. Catches errors thrown during function execution
 * 2. Maps them to Elba connection error types using mapElbaConnectionError
 * 3. Triggers an uninstall event when a connection error occurs
 */

export const elbaConnectionErrorMiddleware = createElbaConnectionErrorMiddleware({
  mapErrorFn: mapElbaConnectionError,
  eventName: `{{name}}/app.uninstalled`,
});
