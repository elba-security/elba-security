import { and, eq } from 'drizzle-orm';
import { NonRetriableError } from 'inngest';
import { decodeJwt } from 'jose';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import { inngest } from '@/inngest/client';
import { decrypt } from '@/common/crypto';

export const inspectToken = inngest.createFunction(
  {
    id: 'microsoft-inspect-token',
    retries: 0,
  },
  { event: 'microsoft/debug.inspect_token.requested' },
  async ({ event }) => {
    const { organisationId } = event.data;
    const [organisation] = await db
      .select({
        token: organisationsTable.token,
      })
      .from(organisationsTable)
      .where(and(eq(organisationsTable.id, organisationId)));

    if (!organisation) {
      throw new NonRetriableError(`Could not retrieve organisation with id=${organisationId}`);
    }

    const decryptedToken = await decrypt(organisation.token);

    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- exclude sensitive details that could be used to rebuild the token
    const { aio, uti, rh, ...details } = decodeJwt(decryptedToken);

    return details;
  }
);
