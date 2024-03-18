import { NonRetriableError } from 'inngest';
import { eq } from 'drizzle-orm';
import type { AnyElbaInngest } from '../client/inngest';
import { createElbaClient } from '../../elba/client';

export const removeOrganisation = <T extends AnyElbaInngest>(inngest: T) =>
  inngest.createFunction(
    {
      id: `${inngest.id}-remove-organisation`,
    },
    {
      event: `${inngest.id}/app.uninstalled`,
    },
    async ({ event }) => {
      const {
        dbSchema: { organisationsTable },
        db,
      } = inngest;
      const { organisationId } = event.data;
      const [organisation] = await inngest.db
        .select({
          region: organisationsTable.region,
        })
        .from(organisationsTable)
        .where(eq(organisationsTable.id, organisationId));

      if (!organisation) {
        throw new NonRetriableError(`Could not retrieve organisation with id=${organisationId}`);
      }

      const elba = createElbaClient(organisationId, organisation.region);

      await elba.connectionStatus.update({ hasError: true });

      await db.delete(organisationsTable).where(eq(organisationsTable.id, organisationId));
    }
  );
