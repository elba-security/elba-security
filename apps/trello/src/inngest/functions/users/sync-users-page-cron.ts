import { NonRetriableError } from 'inngest';
import { inngest } from '@/inngest/client';
import { getTrelloMembers, getTrelloUsersIds, updateElba } from '@/app/auth/service';
import { getOrganizationIds, getoken } from './service';

type TrelloMember = {
  id: string;
  username: string;
  fullName: string;
  email: string;
  organizationId?: string;
};

export const syncUsersCron = inngest.createFunction(
  { id: 'weekly-activity-load-users' },
  { cron: 'TZ=Europe/Paris 49 11 * * 1' },
  async ({ step }) => {
    const orgIds: string[] = await step.run('fetch-organizationIDs', async () => {
      const ids = await getOrganizationIds();
      return ids;
    });

    await step.run('sync-user', async () => {
      try {
        for await (const organisationId of orgIds) {
          const token: string = await getoken(organisationId);
          const membersID: { id: string }[] = await getTrelloUsersIds({ token, organisationId });
          const members: TrelloMember[] = await getTrelloMembers({ membersID, token });
          if (!members.length) {
            await updateElba(members, organisationId);
          }
        }
      } catch (error) {
        throw new NonRetriableError(`${error}`);
      }
    });

    return {
      status: 'completed',
    };
  }
);
