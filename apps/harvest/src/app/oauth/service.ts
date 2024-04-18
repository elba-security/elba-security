import { addSeconds } from 'date-fns';
import { getHarvestId } from '@/connectors/accounts';
import { getAccessToken } from '@/connectors/auth';
import { db, Organisation } from '@/database';
import { inngest } from '@/inngest/client';
import { encrypt } from '@/common/crypto';

type SetupOrganisationParams = {
  organisationId: string;
  code: string;
  region: string;
};

export const setupOrganisation = async ({
  organisationId,
  code,
  region,
}: SetupOrganisationParams) => {
  const { accessToken, refreshToken, expiresIn } = await getAccessToken(code);
  const harvestId = await getHarvestId(accessToken);
  if (!harvestId) {
    throw new Error('Could not retrieve harvest account id');
  }
  const encryptedToken = await encrypt(accessToken);
  await db
    .insert(Organisation)
    .values({
      id: organisationId,
      accessToken,
      refreshToken,
      harvestId: String(harvestId),
      region,
    })
    .onConflictDoUpdate({
      target: [Organisation.id],
      set: {
        id: organisationId,
        accessToken,
        refreshToken,
        harvestId: String(harvestId),
        region,
      },
    });

  await inngest.send([
    {
      name: 'harvest/token.refresh.requested',
      data: {
        organisationId,
        expiresAt: addSeconds(new Date(), expiresIn).getTime(),
      },
    },
    {
      name: 'harvest/users.page_sync.requested',
      data: {
        isFirstSync: true,
        organisationId,
        region,
        syncStartedAt: Date.now(),
        page: null,
      },
    },
  ]);
};
