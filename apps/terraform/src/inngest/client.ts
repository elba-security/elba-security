import { ElbaInngestClient } from '@elba-security/inngest';
import { env } from '@/common/env';
import {
  getOrganizationMemberships,
  getAuthenticatedUserOrganization,
  deleteOrganizationMembership,
} from '@/connectors/terraform/users';

export const elbaInngestClient = new ElbaInngestClient({
  name: 'terraform',
  nangoAuthType: 'OAUTH2',
  nangoIntegrationId: env.NANGO_INTEGRATION_ID,
  nangoSecretKey: env.NANGO_SECRET_KEY,
  sourceId: env.ELBA_SOURCE_ID,
});

elbaInngestClient.createElbaUsersSyncSchedulerFn(env.TERRAFORM_USERS_SYNC_CRON);

elbaInngestClient.createElbaUsersSyncFn(async ({ connection, cursor }) => {
  // Get the organization name from the authenticated user
  const { organizationName, userId: authUserId } = await getAuthenticatedUserOrganization(
    connection.credentials.access_token
  );

  // Fetch organization memberships with user data
  const result = await getOrganizationMemberships({
    accessToken: connection.credentials.access_token,
    organizationName,
    page: cursor ? Number(cursor) : null,
  });

  // Transform memberships to Elba user format
  const users = result.memberships
    .filter((item) => {
      // Skip if no user data or if it's the authenticated user
      if (!item.user || item.user.id === authUserId) {
        return false;
      }
      // Skip service accounts
      if (item.user.attributes['is-service-account']) {
        return false;
      }
      return true;
    })
    .map((item) => ({
      id: item.membership.id, // Use membership ID as user ID for deletion
      displayName: item.membership.attributes.username || item.membership.attributes.email,
      email: item.membership.attributes.email,
      additionalEmails: [],
      isSuspendable: true, // Regular users can be suspended
      metadata: {
        organizationMembershipId: item.membership.id,
        userId: item.user?.id || '',
      },
    }));

  return {
    users,
    cursor: result.nextPage ? String(result.nextPage) : null,
  };
});

elbaInngestClient.createInstallationValidateFn(async ({ connection }) => {
  // Validate the connection by getting authenticated user and organization
  await getAuthenticatedUserOrganization(connection.credentials.access_token);
});

elbaInngestClient.createElbaUsersDeleteFn({
  isBatchDeleteSupported: false,
  deleteUsersFn: async ({ connection, id }) => {
    const oauth2Connection = connection as { credentials: { access_token: string } };
    await deleteOrganizationMembership({
      accessToken: oauth2Connection.credentials.access_token,
      membershipId: id,
    });
  },
});
