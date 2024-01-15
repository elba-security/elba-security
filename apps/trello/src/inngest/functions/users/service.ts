import { sql } from '@vercel/postgres';
import { db } from '@/database/client';
import { eq } from 'drizzle-orm';
import { Organisation } from '@/database/schema';

type Organization = {
  id: string;
};

export const getOrganizationIds = async (): Promise<string[]> => {
  const result: { rows: Organization[] } = await sql.query('SELECT Id FROM organisation');
  const organisationIds: string[] = result.rows.map((row) => row.id);

  return organisationIds;
};

export const getoken = async (organisationId: string) => {
  try {
    const [organisation] = await db
      .select({ token: Organisation.token })
      .from(Organisation)
      .where(eq(Organisation.id, organisationId));

    if (!organisation) {
      throw new Error(`Could not retrieve organisation with id=${organisationId}`);
    }

    return organisation.token;
  } catch (error) {
    // Handle any errors that might occur during token retrieval
    throw new Error(`Error retrieving token for organisation with id=${organisationId}`);
  }
};
