import { eq } from 'drizzle-orm';
import { NonRetriableError } from 'inngest';
import { getAllItemPermissions } from '@/connectors/microsoft/onedrive/permissions';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import { inngest } from '@/inngest/client';
import { decrypt } from '@/common/crypto';
import { env } from '@/common/env';

export const getItemPermissions = inngest.createFunction(
  {
    id: 'onedrive-get-item-permissions',
    throttle: {
      limit: env.MICROSOFT_DATA_PROTECTION_ITEMS_PERMISSIONS_RATE_LIMIT,
      period: env.MICROSOFT_DATA_PROTECTION_ITEMS_PERMISSIONS_RATE_LIMIT_PERIOD,
      key: 'event.data.organisationId',
    },
    cancelOn: [
      {
        event: 'onedrive/app.uninstalled',
        match: 'data.organisationId',
      },
      {
        event: 'onedrive/app.installed',
        match: 'data.organisationId',
      },
      {
        event: 'onedrive/sync.cancel',
        match: 'data.organisationId',
      },
    ],
    retries: 5,
  },
  { event: 'onedrive/items.get-permissions.requested' },
  async ({ event }) => {
    const { organisationId, userId, itemId } = event.data;

    const [organisation] = await db
      .select({ token: organisationsTable.token })
      .from(organisationsTable)
      .where(eq(organisationsTable.id, organisationId));

    if (!organisation) {
      throw new NonRetriableError(`Could not retrieve organisation with id=${organisationId}`);
    }

    const token = await decrypt(organisation.token);

    return getAllItemPermissions({ token, userId, itemId });
  }
);
