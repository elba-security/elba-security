import { getToken } from '@/connectors/auth';
import { db } from '@/database/client';
import { Organisation } from '@/database/schema';
import { inngest } from '@/inngest/client';

type setUpOrganisationParams = {
  organisation_id: string;
  region: string;
  code: string;
};

export const setUpOrganisation = async ({
  organisation_id,
  region,
  code,
}: setUpOrganisationParams) => {
  try {
    const { access_token, refresh_token, expires_in } = await getToken(code);

    const organisationValue = {
      region,
      accessToken: access_token,
      refreshToken: refresh_token,
      expiresIn: expires_in,
    };

    await db
      .insert(Organisation)
      .values({ id: organisation_id, ...organisationValue })
      .onConflictDoUpdate({
        target: Organisation.id,
        set: {
          ...organisationValue,
        },
      });

    await inngest.send({
      name: 'zoom/users.sync',
      data: {
        isFirstSync: true,
        organisationId: organisation_id,
        syncStartedAt: Date.now(),
        page: null,
        region,
      },
    });
  } catch (error) {
    console.log('🚀 ~ file: service.ts:19 ~ error:', error);
  }
};
