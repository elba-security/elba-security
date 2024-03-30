import { eq } from 'drizzle-orm';
import { NonRetriableError } from 'inngest';
import { Elba } from '@elba-security/sdk';
import { getUsers } from '@/connectors/users';
import { db } from '@/database/client';
import { Organisation } from '@/database/schema';
import { inngest } from '@/inngest/client';
import { env } from '@/env';

type EventData = {
    organisationId: string;
    pageUrl: string;
    isFirstSync: boolean,
}

export const syncUsersPage = inngest.createFunction(
  {
    id: 'zendesk-sync-users',
     priority: {
      run: 'event.data.isFirstSync ? 600 : -600',
    },
    concurrency: {
      key: 'event.data.organisationId',
      limit: 1,
    },
  },
  { event: 'zendesk/users.sync.triggered' },
  async ({ event, step }) => {
    const syncStartedAt = Date.now();
    const { organisationId, pageUrl } = event.data as EventData;
    
    const [organisation] = await db.select({
      auth_token: Organisation.auth_token,
      domain: Organisation.domain,
      region: Organisation.region,
    }).from(Organisation).where(eq(Organisation.id, organisationId));

    if (!organisation?.auth_token) {
      throw new NonRetriableError(`Could not retrieve organisation with id=${organisationId}`);
    }

    const result = await getUsers({
      token: organisation.auth_token, 
      pageUrl,
      });
    
    const users = result.users.map(user =>{
      return {
        id: String(user.id),
        displayName: user.name,
        email: user.email,
        additionalEmails: [],
      }
    });

    const elba = new Elba({
      organisationId,
      apiKey: env.ELBA_API_KEY,
      baseUrl: env.ELBA_API_BASE_URL,
      region: organisation.region,
    });

    await elba.users.update({ users });

    if (result.next_page) {
      await step.sendEvent('sync-users-page', {
        name: 'zendesk/users.sync.triggered',
        data: {
          ...event.data,
          pageUrl: result.next_page,
        } as EventData,
      });
      
      return {
        status: 'ongoing'
      }
    }
    
    await elba.users.delete({ syncedBefore: new Date(syncStartedAt).toISOString() });
      return {
        status: 'completed'
      }
  }
);
