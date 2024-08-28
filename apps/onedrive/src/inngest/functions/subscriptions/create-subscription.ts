// import { eq } from 'drizzle-orm';
// import { NonRetriableError } from 'inngest';
// import { inngest } from '@/inngest/client';
// import { db } from '@/database/client';
// import { organisationsTable } from '@/database/schema';
// import { createSubscription as createOnedriveSubscription } from '@/connectors/microsoft/subscriptions/subscriptions';
// import { decrypt } from '@/common/crypto';
// import { env } from '@/common/env';

// export const createSubscription = inngest.createFunction(
//   {
//     id: 'onedrive-subscribe-to-drive',
//     concurrency: {
//       key: 'event.data.siteId',
//       limit: env.MICROSOFT_CREATE_SUBSCRIPTION_CONCURRENCY,
//     },
//     cancelOn: [
//       {
//         event: 'onedrive/app.uninstalled',
//         match: 'data.organisationId',
//       },
//       {
//         event: 'onedrive/app.installed',
//         match: 'data.organisationId',
//       },
//     ],
//     retries: 5,
//   },
//   { event: 'onedrive/subscriptions.create.triggered' },
//   async ({ event }) => {
//     const { organisationId, userId } = event.data;

//     const [organisation] = await db
//       .select({
//         token: organisationsTable.token,
//       })
//       .from(organisationsTable)
//       .where(eq(organisationsTable.id, organisationId));

//     if (!organisation) {
//       throw new NonRetriableError(`Could not retrieve organisation with id=${organisationId}`);
//     }

//     const changeType = 'updated';
//     const resource = `users/${userId}/drive/root`;
//     const clientState = crypto.randomUUID();

//     return createOnedriveSubscription({
//       token: await decrypt(organisation.token),
//       changeType,
//       resource,
//       clientState,
//     });
//   }
// );
