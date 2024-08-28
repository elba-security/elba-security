// import { eq } from 'drizzle-orm';
// import { NonRetriableError } from 'inngest';
// import { db } from '@/database/client';
// import { organisationsTable, subscriptionsTable } from '@/database/schema';
// import { inngest } from '@/inngest/client';
// import { decrypt } from '@/common/crypto';
// import { getDeltaItems } from '@/connectors/microsoft/delta/delta';
// import { createSubscription } from '../subscriptions/create-subscription';

// export const initializeDelta = inngest.createFunction(
//   {
//     id: 'onedrive-initialize-data-protection-delta',
//     concurrency: {
//       key: 'event.data.siteId',
//       limit: 1,
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
//   { event: 'onedrive/delta.initialize.requested' },
//   async ({ event, step }) => {
//     const { organisationId, userId, isFirstSync } = event.data;

//     const [organisation] = await db
//       .select({
//         token: organisationsTable.token,
//       })
//       .from(organisationsTable)
//       .where(eq(organisationsTable.id, organisationId));

//     if (!organisation) {
//       throw new NonRetriableError(`Could not retrieve organisation with itemId=${organisationId}`);
//     }

//     const newDeltaToken = await step.run('paginate', async () => {
//       const result = await getDeltaItems({
//         token: await decrypt(organisation.token),
//         userId,
//         deltaToken: null,
//       });

//       if (!('newDeltaToken' in result)) {
//         throw new Error('Failed to retrieve new delta token');
//       }

//       return result.newDeltaToken;
//     });

//     const data = await step.invoke('create-subscription', {
//       function: createSubscription,
//       data: {
//         organisationId,
//         userId,
//         isFirstSync,
//       },
//     });

//     await db
//       .insert(subscriptionsTable)
//       .values({
//         organisationId,
//         userId,
//         subscriptionId: data.id,
//         subscriptionExpirationDate: data.expirationDateTime,
//         subscriptionClientState: data.clientState,
//         delta: newDeltaToken,
//       })
//       .onConflictDoUpdate({
//         target: [subscriptionsTable.organisationId, subscriptionsTable.userId],
//         set: {
//           subscriptionId: data.id,
//           subscriptionExpirationDate: data.expirationDateTime,
//           subscriptionClientState: data.clientState,
//           delta: newDeltaToken,
//         },
//       });

//     return { status: 'completed' };
//   }
// );
