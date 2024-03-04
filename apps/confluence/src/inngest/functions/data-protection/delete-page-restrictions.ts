import { deletePageUserRestrictions } from '@/connectors/confluence/page-restrictions';
import { inngest } from '@/inngest/client';
import { decrypt } from '@/common/crypto';
import { env } from '@/common/env';
import { getOrganisation } from '../../common/organisations';

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
    const { organisationId, pageId, userIds } = event.data;
    const organisation = await getOrganisation(organisationId);
    const accessToken = await decrypt(organisation.accessToken);

    await Promise.all(
      userIds.map((userId) =>
        deletePageUserRestrictions({
          accessToken,
          instanceId: organisation.instanceId,
          pageId,
          userId,
        })
      )
    );
  }
);
