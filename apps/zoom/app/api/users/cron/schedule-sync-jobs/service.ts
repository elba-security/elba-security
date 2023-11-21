import { sql } from "@vercel/postgres";

export const scheduleUsersSyncJobs = async () => {
    // schedule jobs to be fetched by run-sync-job taks
    console.log("RUNNING SCHEDULE USERS SYNC JOB");
    try {
        await sql`
            CREATE TABLE IF NOT EXISTS
            users_sync_jobs
             ( 
                id SERIAL PRIMARY KEY,
                organization_id INT NOT NULL,
                batchSize INT NOT NULL,
                retries INT NOT NULL,
                syncStartedAt VARCHAR(255) NOT NULL,
                isFirstSync BOOLEAN NOT NULL,
                status VARCHAR(255) NOT NULL,
                createdAt VARCHAR(255) NOT NULL,
                updatedAt VARCHAR(255) NOT NULL
            )
        `;
    } catch (error) {
        console.log("Error creating or updating users_sync_jobs table")
    }

    try {
        // selecting unique organization ids
        const zoomUsersAuthData = await sql`SELECT DISTINCT organization_id FROM zoom_credentials`
        if(zoomUsersAuthData && zoomUsersAuthData.rows.length > 0) {
            const zoomPromises = zoomUsersAuthData.rows.map(async (row) => {
                // fetching only organization ids
                const {organization_id} = row;

                // adding to scheduled jobs
                const valuesToInsert = {
                    organization_id: organization_id,
                    batchSize: process.env.SCHEDULE_SYNC_JOB_BATCH_SIZE || 3,
                    retries: 0,
                    syncStartedAt: new Date().toISOString(),
                    isFirstSync: true,
                    status: "scheduled",
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                }
                await sql`INSERT INTO users_sync_jobs (
                    organization_id,
                    batchSize,
                    retries,
                    syncStartedAt,
                    isFirstSync,
                    status,
                    createdAt,
                    updatedAt
                ) VALUES (
                    ${valuesToInsert.organization_id},
                    ${valuesToInsert.batchSize},
                    ${valuesToInsert.retries},
                    ${valuesToInsert.syncStartedAt},
                    ${valuesToInsert.isFirstSync},
                    ${valuesToInsert.status},
                    ${valuesToInsert.createdAt},
                    ${valuesToInsert.updatedAt}
                )
                `
            });
            await Promise.all(zoomPromises)
        }
    } catch (error) {
        console.log("Error pushing users to elba")
    }

};
