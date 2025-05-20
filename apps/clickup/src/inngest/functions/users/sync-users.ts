import type { User } from '@elba-security/sdk';
import { getUsers } from '@/connectors/clickup/users';
import { getTeamIds } from '@/connectors/clickup/teams';
import { type ClickUpUser } from '@/connectors/clickup/users';
import { inngest } from '@/inngest/client';
import { createElbaOrganisationClient } from '@/connectors/elba/client';
import { nangoAPIClient } from '@/common/nango';

const formatElbaUser = ({ teamId, user }: { teamId: string; user: ClickUpUser }): User => ({
  id: String(user.id),
  displayName: user.username || user.email,
  email: user.email,
  role: user.role,
  additionalEmails: [],
  isSuspendable: user.role !== 'owner',
  url: `https://app.clickup.com/${teamId}/settings/team/${teamId}/users`,
});

export const syncUsers = inngest.createFunction(
  {
    id: 'clickup-sync-users',
    priority: {
      run: 'event.data.isFirstSync ? 600 : 0',
    },
    concurrency: {
      key: 'event.data.organisationId',
      limit: 1,
    },
    retries: 5,
    cancelOn: [
      {
        event: 'clickup/app.uninstalled',
        match: 'data.organisationId',
      },
      {
        event: 'clickup/app.installed',
        match: 'data.organisationId',
      },
    ],
  },
  { event: 'clickup/users.sync.requested' },
  async ({ event, step, logger }) => {
    const { organisationId, nangoConnectionId, region, syncStartedAt } = event.data;

    const elba = createElbaOrganisationClient({
      organisationId,
      region,
    });

    const { credentials } = await nangoAPIClient.getConnection(nangoConnectionId, 'OAUTH2');
    const teamIds = await getTeamIds(credentials.access_token);

    const result = await getUsers({
      token: credentials.access_token,
      teamId: teamIds[0].id,
    });
    const users = result.validUsers.map((user) =>
      formatElbaUser({
        teamId: teamIds[0].id,
        user,
      })
    );

    if (result.invalidUsers.length > 0) {
      logger.warn('Retrieved users contains invalid data', {
        organisationId,
        invalidUsers: result.invalidUsers,
      });
    }

    if (users.length > 0) {
      await elba.users.update({ users });
    }

    await step.run('finalize', () =>
      elba.users.delete({ syncedBefore: new Date(syncStartedAt).toISOString() })
    );

    return {
      status: 'completed',
    };
  }
);
