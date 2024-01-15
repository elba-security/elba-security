import { sql } from '@vercel/postgres';
import { NonRetriableError } from 'inngest';

export const createOrganisation = async ({ id, region, createdAt, token }) => {
  try {
    // create the organizations table if it doesn't exist
    await sql`CREATE TABLE IF NOT EXISTS organization ( id varchar(255), token varchar(255) , region varchar(255) , createdAt varchar(255));`;

    // Insert data into the organizations table
    const insertResult = await sql`
      INSERT INTO organisation (Id,Token,Region,Createdat) VALUES
      ( ${id}, ${token} , ${region} , ${createdAt}) RETURNING *
    `;

    return insertResult.rows;
  } catch (error) {
    throw new NonRetriableError(`${error}`);
  }
};
