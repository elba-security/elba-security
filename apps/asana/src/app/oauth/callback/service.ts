/* eslint-disable camelcase -- conveniency */
import { db } from '@/database/client';
import { Organisation } from '@/database/schema';
import { inngest } from '@/inngest/client';
import { getToken } from '@/connectors/auth';

export const setupOrganisation = async (organisationId: string, code: string) => {
  // retrieve token from SaaS API using the given code
  const {
    access_token,
    expires_in,
    refresh_token,
    data: { id: asanaId, gid, name, email },
  } = await getToken(code);

  const expiresAt = new Date(Date.now() + expires_in * 1000);

  const upsertValue = {
    accessToken: access_token,
    expiresAt,
    refreshToken: refresh_token,
    asanaId,
    gid,
    name,
    email,
  };

  await db
    .insert(Organisation)
    .values({
      id: organisationId,
      ...upsertValue,
    })
    .onConflictDoUpdate({
      target: Organisation.id,
      set: {
        ...upsertValue,
        // we remove webhookSecret because we have updated the webhook
        webhookSecret: null,
      },
    });

  await inngest.send({
    name: 'users/sync',
    data: {
      isFirstSync: true,
      organisationId,
      syncStartedAt: Date.now(),
      page: null,
    },
  });
};
