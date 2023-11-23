import { sql } from "@vercel/postgres";
import { userSyncJobsTable } from "../user-sync-table";

export const scheduleUsersSyncJobs = async () => {
    // schedule jobs to be fetched by run-sync-job taks
    // creating table (for dev) if it doesn't exist
    try {
        await userSyncJobsTable();
    } catch (error: any) {
        return {
            success: false,
            error: error.message
        };
    }
    try {
        // adding to scheduled jobs
        const valuesToInsert = {
            organization_id: "b91f113b-bcf9-4a28-98c7-5b13fb671c19",
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
        ON CONFLICT (organization_id) DO NOTHING
        `
        return {
            success: true
        }
    } catch (error: any) {
        console.log(error)
        return {
            success: false,
            error: "Failed to add new scheduled job"
        }
    }
};
