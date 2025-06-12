import { eq } from 'drizzle-orm';
import { NonRetriableError } from 'inngest';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import { inngest } from '@/inngest/client';

export type GetTokenEvents = {
  'outlook/common.get_token.requested': GetTokenRequested;
};

type GetTokenRequested = {
  data: {
    organisationId: string;
  };
};

export const getToken = inngest.createFunction(
  {
    id: 'outlook-get-token',
    retries: 3,
  },
  { event: 'outlook/common.get_token.requested' },
  async ({
    event: {
      data: { organisationId },
    },
  }) => {
    const organisation = await db.query.organisationsTable.findFirst({
      where: eq(organisationsTable.id, organisationId),
      columns: {
        token: true,
      },
    });

    if (!organisation) {
      throw new NonRetriableError(
        `Could not retrieve token for organisation with id=${organisationId}`
      );
    }

    return organisation.token;
  }
);
