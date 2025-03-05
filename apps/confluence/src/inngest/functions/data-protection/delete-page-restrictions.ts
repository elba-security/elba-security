import { NonRetriableError } from 'inngest';
import { deletePageUserRestrictions } from '@/connectors/confluence/page-restrictions';
import { inngest } from '@/inngest/client';
import { nangoAPIClient } from '@/common/nango';
import { getInstance } from '@/connectors/confluence/auth';
import { env } from '@/common/env';

export const deletePageRestrictions = inngest.createFunction(
  {
    id: 'confluence-delete-page-restrictions',
    cancelOn: [
      {
        event: 'confluence/app.uninstalled',
        match: 'data.organisationId',
      },
      {
        event: 'confluence/app.installed',
        match: 'data.organisationId',
      },
    ],
    concurrency: {
      key: 'event.data.organisationId',
      limit: env.DATA_PROTECTION_DELETE_PAGE_RESTRICTIONS_ORGANISATION_CONCURRENCY,
    },
    retries: env.DATA_PROTECTION_DELETE_PAGE_RESTRICTIONS_MAX_RETRY,
  },
  {
    event: 'confluence/data_protection.delete_page_restrictions.requested',
  },
  async ({ event }) => {
    const { pageId, userIds, nangoConnectionId } = event.data;
    const { credentials } = await nangoAPIClient.getConnection(nangoConnectionId);
    if (!('access_token' in credentials) || typeof credentials.access_token !== 'string') {
      throw new NonRetriableError('Could not retrieve Nango credentials');
    }
    const instance = await getInstance(credentials.access_token);
    const accessToken = credentials.access_token;
    await Promise.all(
      userIds.map((userId) =>
        deletePageUserRestrictions({
          accessToken,
          instanceId: instance.id,
          pageId,
          userId,
        })
      )
    );
  }
);
