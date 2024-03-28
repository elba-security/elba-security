import { eq } from 'drizzle-orm';
import { NonRetriableError } from 'inngest';
import { db } from '@/database/client';
import type { Organisation } from '@/database/schema';
import { organisationsTable } from '@/database/schema';
import { inngest } from '@/inngest/client';

export type GetOrganisationEvents = {
  'google/common.get_organisation.requested': GetOrganisationRequested;
};

type GetOrganisationRequested = {
  data: {
    organisationId: string;
    columns: (keyof Organisation)[];
  };
};

export const getOrganisation = inngest.createFunction(
  {
    id: 'google-get-organisation',
    retries: 3,
    concurrency: {
      limit: 50,
    },
  },
  { event: 'google/common.get_organisation.requested' },
  async ({
    event: {
      data: { organisationId, columns },
    },
  }) => {
    const organisation = await db.query.organisationsTable.findFirst({
      where: eq(organisationsTable.id, organisationId),
      columns: columns.reduce((acc, column) => ({ ...acc, [column]: true }), {}),
    });

    if (!organisation) {
      throw new NonRetriableError(`Could not retrieve organisation with id=${organisationId}`);
    }

    return organisation as Organisation;
  }
);
