import type { User } from '@elba-security/sdk';
import { NonRetriableError } from 'inngest';
import { inngest } from '@/inngest/client';
import { createElbaOrganisationClient } from '@/connectors/elba/client';
import { nangoAPIClient } from '@/common/nango';

// TODO: Replace with your source-specific user type and import
type SourceUser = {
  id: string;
  displayName: string;
  email?: string;
};

/**
 * Formats a source user into Elba's user format.
 * This is a placeholder implementation - update it based on your source's user structure.
 *
 * Consider:
 * - How to handle user suspension (isSuspendable)
 * - Additional email addresses
 * - User profile URLs
 * - Required vs optional fields
 */
const formatElbaUser = (user: SourceUser): User => ({
  id: user.id,
  displayName: user.displayName,
  email: user.email,
  additionalEmails: [],
  // TODO: Implement suspension logic based on your source's requirements
  isSuspendable: true,
  // TODO: Add the URL where admins can manage this user
  url: `https://your-saas.com/users/${user.id}`,
});

/**
 * Syncs users from your source to Elba.
 * This function:
 * 1. Retrieves OAuth credentials from Nango
 * 2. Fetches users from your source API
 * 3. Formats and sends users to Elba
 * 4. Handles pagination by triggering new sync events
 * 5. Cleans up removed users on the final page
 *
 * The function is automatically cancelled if:
 * - The app is uninstalled
 * - The app is reinstalled (to avoid duplicate syncs)
 *
 * Rate limiting (429) is handled by the rate-limit-middleware.
 */
export const syncUsers = inngest.createFunction(
  {
    id: '{{name}}-sync-users',
    priority: {
      run: 'event.data.isFirstSync ? 600 : 0',
    },
    concurrency: {
      key: 'event.data.organisationId',
      limit: 1,
    },
    retries: 5,
    // Cancel this sync if the app is uninstalled or reinstalled
    cancelOn: [
      {
        event: '{{name}}/app.uninstalled',
        match: 'data.organisationId',
      },
      {
        event: '{{name}}/app.installed',
        match: 'data.organisationId',
      },
    ],
  },
  { event: '{{name}}/users.sync.requested' },
  async ({ event, step, logger }) => {
    const { organisationId, nangoConnectionId, region, syncStartedAt, page } = event.data;

    const elba = createElbaOrganisationClient({
      organisationId,
      region,
    });

    const nextPage = await step.run('list-users', async () => {
      // Get OAuth credentials from Nango
      const { credentials } = await nangoAPIClient.getConnection(nangoConnectionId);
      if (!('access_token' in credentials) || typeof credentials.access_token !== 'string') {
        throw new NonRetriableError('Could not retrieve Nango credentials');
      }

      // TODO: Replace with your source-specific user fetching logic
      const result = await getUsers({
        accessToken: credentials.access_token,
        page,
      });

      // Placeholder for demonstration
      const result = {
        users: [] as SourceUser[],
        invalidUsers: [] as unknown[],
        nextPage: null as string | null,
      };

      // Format valid users for Elba
      const users = result.users.map(formatElbaUser);

      // Log any invalid users for debugging
      if (result.invalidUsers.length > 0) {
        logger.warn('Retrieved users contains invalid data', {
          organisationId,
          invalidUsers: result.invalidUsers,
        });
      }

      // Only update if we have users to sync
      if (users.length > 0) {
        await elba.users.update({ users });
      }

      return result.nextPage;
    });

    // If there's a next page, trigger sync for that page
    if (nextPage) {
      await step.sendEvent('sync-users', {
        name: '{{name}}/users.sync.requested',
        data: {
          ...event.data,
          page: nextPage,
        },
      });
      return {
        status: 'ongoing',
      };
    }

    // Clean up users that weren't included in this sync
    await step.run('finalize', () =>
      elba.users.delete({ syncedBefore: new Date(syncStartedAt).toISOString() })
    );

    return {
      status: 'completed',
    };
  }
);
