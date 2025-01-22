import { createElbaConnectionErrorMiddleware } from '@elba-security/inngest';
import { mapElbaConnectionError } from '@/connectors/common/error';
import packageJson from '../../../package.json';

/**
 * Middleware for handling Elba connection errors in Inngest functions.
 * This middleware:
 * 1. Catches errors thrown during function execution
 * 2. Maps them to Elba connection error types using mapElbaConnectionError
 * 3. Triggers an uninstall event when a connection error occurs
 *
 * The uninstall event name is dynamically generated from the package name:
 * - Package: "@elba-security/bitbucket"
 * - Event: "bitbucket/app.uninstalled"
 *
 * This ensures consistent event naming across the integration.
 */

// Extract the integration name from the package name (e.g., "@elba-security/bitbucket" -> "bitbucket")
const integrationName =
  packageJson.name
    .split('/')
    .pop()
    ?.replace(/^@elba-security\//, '') ?? '';

export const elbaConnectionErrorMiddleware = createElbaConnectionErrorMiddleware({
  mapErrorFn: mapElbaConnectionError,
  eventName: `${integrationName}/app.uninstalled`,
});
