import { env } from '@/env';
import { v4 as uuidv4 } from 'uuid';
import { db } from '@/database/client';
import { inngest } from '@/inngest/client';
import { RedirectType, redirect } from 'next/navigation';
import { Admin, Organisation } from '@/database/schema';

export const setupAdmin = async (organisationId: string) => {
  try {
    const [admin] = await db
      .insert(Admin)
      .values({
        id: uuidv4(),
        organisationId: organisationId,
        createdAt: new Date(),
        lastSyncAt: new Date(),
      })
      .returning();
    return admin;
  } catch (err) {
    if (err.message.includes('duplicate key value violates unique constraint')) {
      console.log('Admin already exists');
    } else {
      console.log('Error: ', err);
      redirect(
        `${env.ELBA_REDIRECT_URL}?source=${env.ELBA_SOURCE_ID}&error=${
          err?.response?.status ?? 500
        }`,
        RedirectType.replace
      );
    }
  }
};

export const setupOrganisation = async (
  organisationId: string,
  access_token: string,
  refresh_token: string
) => {
  const [organisation] = await db
    .insert(Organisation)
    .values({
      id: organisationId,
      access_token: access_token,
      refresh_token: refresh_token,
      createdAt: new Date(),
    })
    .returning();

  if (!organisation) {
    throw new Error(`Could not setup organisation with id=${organisationId}`);
  }

  await inngest.send({
    name: 'users/page_sync.requested',
    data: {
      organisationId,
      access_token: access_token,
      refresh_token: refresh_token,
      syncStartedAt: Date.now(),
      isFirstSync: true,
      cursor: null,
    },
  });

  return organisation;
};
