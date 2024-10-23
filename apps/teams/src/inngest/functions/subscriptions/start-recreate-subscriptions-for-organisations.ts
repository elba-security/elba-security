import { sql } from 'drizzle-orm';
import { type InferSelectModel } from 'drizzle-orm';
import { inngest } from '@/inngest/client';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';

export const startRecreateSubscriptionsForOrganisations = inngest.createFunction(
  {
    id: 'teams/start-recreate-subscriptions-for-organisations',
  },
  { event: 'teams/subscriptions.start-recreate.requested' },
  async ({ step }) => {
    const organisationsGroupedByTenant = await db
      .select({
        tenantId: organisationsTable.tenantId,
        organisations: sql<
          InferSelectModel<typeof organisationsTable>[]
        >`json_agg(${organisationsTable})`,
      })
      .from(organisationsTable)
      .groupBy(sql`${organisationsTable.tenantId}`);

    if (organisationsGroupedByTenant.length > 0) {
      await step.sendEvent(
        'recreate-subscriptions',
        organisationsGroupedByTenant
          .reduce(
            (acc, group) =>
              group.organisations[0]?.id
                ? [
                    ...acc,
                    {
                      organisationId: group.organisations[0].id,
                      tenantId: group.tenantId,
                    },
                  ]
                : acc,
            []
          )
          .map(({ tenantId, organisationId }) => ({
            name: 'teams/subscriptions.recreate.requested',
            data: {
              organisationId,
              tenantId,
            },
          }))
      );
    }
  }
);
