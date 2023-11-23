import { sql } from "@vercel/postgres";

export const userSyncJobsTable = async () => {
    try {
        await sql`
            CREATE TABLE IF NOT EXISTS
            users_sync_jobs
             ( 
                id SERIAL PRIMARY KEY,
                organization_id VARCHAR(255) UNIQUE NOT NULL,
                batchSize INT NOT NULL,
                retries INT NOT NULL,
                syncStartedAt VARCHAR(255) NOT NULL,
                isFirstSync BOOLEAN NOT NULL,
                status VARCHAR(255) NOT NULL,
                createdAt VARCHAR(255) NOT NULL,
                updatedAt VARCHAR(255) NOT NULL,
                paginationToken VARCHAR(2000),
                pageNumber INT
            )
        `;
    } catch (error) {
        console.log(error)
        throw new Error("Error creating or updating users_sync_jobs table")
    }
}