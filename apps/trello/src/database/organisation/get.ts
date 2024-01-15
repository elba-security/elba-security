import { sql } from '@vercel/postgres';
import { NonRetriableError } from 'inngest';

export const getOrganisation = async (id: string) => {
  try {
    // create the organizations table if it doesn't exist
    const organisation = await sql`SELECT * FROM organisation WHERE id = ${id}`;
    return organisation.rows[0];
  } catch (error) {
    throw new NonRetriableError(`${error}`);
  }
};
