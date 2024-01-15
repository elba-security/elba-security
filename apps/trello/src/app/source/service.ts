import { sql } from '@vercel/postgres';

type Organisation = {
  rows: Token[];
};

type Token = {
  token: string | null;
};

export const checkOrganization = async (organizationId: string) => {
  try {
    const result: Organisation = await sql.query('SELECT token FROM organisation WHERE id = $1', [
      organizationId,
    ]);

    // If no rows were found or the token is null/undefined, return false
    if (
      result.rows.length === 0 ||
      result.rows[0]?.token === null ||
      result.rows[0]?.token === undefined
    ) {
      return false;
    }

    // If the organization and a non-null/undefined token are present, return the token
    return result.rows[0]?.token;
  } catch (error) {
    return false;
  }
};
