import type { User } from '@elba-security/sdk';
import { NonRetriableError } from 'inngest';
import { logger } from '@elba-security/logger';
import { type DropboxTeamMember, getUsers } from '@/connectors/dropbox/users';
import { inngest } from '@/inngest/client';
import { getAuthenticatedAdmin } from '@/connectors/dropbox/users';
import { createElbaOrganisationClient } from '@/connectors/elba/client';
import { nangoAPIClient } from '@/common/nango';

const formatElbaUser = ({
  adminTeamMemberId,
  user,
}: {
  adminTeamMemberId: string;
  user: DropboxTeamMember;
}): User => ({
  id: user.profile.team_member_id,
  displayName: user.profile.name.display_name,
  email: user.profile.email,
  additionalEmails: user.profile.secondary_emails.map((email) => email.email),
  isSuspendable: user.profile.team_member_id !== adminTeamMemberId,
  url: 'https://www.dropbox.com/team/admin/members',
});

export const syncUsers = inngest.createFunction(
  {
    id: 'dropbox-sync-users',
    priority: {
      run: 'event.data.isFirstSync ? 600 : 0',
    },
    concurrency: {
      key: 'event.data.organisationId',
      limit: 1,
    },
    cancelOn: [
      {
        event: 'dropbox/app.installed',
        match: 'data.organisationId',
      },
      {
        event: 'dropbox/app.uninstalled',
        match: 'data.organisationId',
      },
    ],
    retries: 5,
  },
  { event: 'dropbox/users.sync.requested' },
  async ({ event, step }) => {
    const { organisationId, syncStartedAt, cursor , nangoConnectionId, region} = event.data;
    const elba = createElbaOrganisationClient({
      organisationId,
      region,
    });

    const nextPage = await step.run('list-users', async () => {
      const { credentials } = await nangoAPIClient.getConnection(nangoConnectionId);
      if (!('access_token' in credentials) || typeof credentials.access_token !== 'string') {
        throw new NonRetriableError('Could not retrieve Nango credentials');
      }

      const { teamMemberId: adminTeamMemberId } = await getAuthenticatedAdmin(credentials.access_token);

      const {
        validUsers,
        invalidUsers,
        cursor: nextCursor,
      } = await getUsers({
        accessToken: credentials.access_token,
        cursor,
      });

      if (invalidUsers.length > 0) {
        logger.info('Invalid users found', { invalidUsers });
      }

      if (validUsers.length > 0) {
        const users = validUsers.map((user) =>
          formatElbaUser({ adminTeamMemberId, user })
        );
        await elba.users.update({ users });
      }

      return nextCursor;
    });

    if (nextPage) {
      await step.sendEvent('synchronize-users', {
        name: 'dropbox/users.sync.requested',
        data: {
          ...event.data,
          cursor: nextPage,
        },
      });
      return {
        status: 'ongoing',
      };
    }

    await step.run('finalize', () =>
      elba.users.delete({ syncedBefore: new Date(syncStartedAt).toISOString() })
    );

    return {
      status: 'completed',
    };
  }
);
