import { sql } from "@vercel/postgres";
import axios from "axios";

export const runUsersSyncJob = async () => {
    // creating table (for dev) if it doesn't exist
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
        //get first scheduled job
        const firstScheduledJob = await sql`SELECT * FROM users_sync_jobs WHERE status='scheduled' LIMIT 1`
        if (firstScheduledJob.rowCount > 0) {
            // get users under the same organization_id
            const batchUsers = await sql`SELECT * FROM zoom_credentials WHERE organization_id=${firstScheduledJob.rows[0].organization_id}`;
            const BATCH_SIZE = parseInt(process.env.USERS_SYNC_JOB_BATCH_SIZE || "5") || firstScheduledJob.rows[0].batchSize || 5;

            const users = [];

            for (let x = 0; x < batchUsers.rowCount; x += BATCH_SIZE) {
                const batch = batchUsers.rows.slice(x, x + BATCH_SIZE);
                for (const user of batch) {
                    try {
                        // get user information from zoom
                        const response = await axios.get('https://api.zoom.us/v2/users/me', {
                            headers: {
                                Authorization: `Bearer ${user.access_token}`,
                            },
                        });
                        if (response.status === 200) {
                            const userData = {
                                id: response.data.id,
                                email: response.data.email,
                                displayName: response.data.display_name,
                                additionalEmails: []
                            }
                            // add to array of users
                            users.push(userData)
                        }
                    } catch (error) {
                        console.log("Error fetching user data")
                        const updateObject = {
                            retries: firstScheduledJob.rows[0].retries + 1,
                            isFirstSync: false,
                            updatedAt: new Date().toISOString()
                        }
                        await sql`
                            UPDATE users_sync_jobs
                            SET 
                                retries=${updateObject.retries},
                                isFirstSync=${updateObject.isFirstSync},
                                updatedAt=${updateObject.updatedAt}
                            WHERE organization_id=${firstScheduledJob.rows[0].organization_id}
                        `
                    }
                }
            }

            const ELBA_API_BASE_URL = process.env.ELBA_API_BASE_URL

            if (!ELBA_API_BASE_URL || ELBA_API_BASE_URL.length === 0) {
                throw new Error("Missing ELBA_API_BASE_URL")
            }

            const ELBA_SOURCE_ID = process.env.ELBA_SOURCE_ID

            if (!ELBA_SOURCE_ID || ELBA_SOURCE_ID.length === 0) {
                throw new Error("Missing ELBA_SOURCE_ID")
            }

            if (users.length > 0) {
                // push to elba if users are found
                await axios.post(`${process.env.ELBA_API_BASE_URL}/api/rest/users`, {
                    sourceId: ELBA_SOURCE_ID,
                    organizationId: firstScheduledJob.rows[0].organization_id,
                    users: users
                })
            } else {
                // delete the org users if no users are found
                await axios({
                    method: 'delete',
                    url: `${ELBA_API_BASE_URL}/api/rest/users`,
                    headers: {
                        'Accept': 'application/json',
                        'Content-Type': 'application/json',
                    },
                    data: {
                        sourceId: ELBA_SOURCE_ID,
                        organizationId: firstScheduledJob.rows[0].organization_id,
                        users: users,
                    },
                });
            }

            // mark the job as completed
            const updateObject = {
                isFirstSync: false,
                updatedAt: new Date().toISOString(),
                status: "completed"
            }
            await sql`
                UPDATE users_sync_jobs
                SET 
                    isFirstSync=${updateObject.isFirstSync},
                    updatedAt=${updateObject.updatedAt},
                    status=${updateObject.status}
                WHERE organization_id=${firstScheduledJob.rows[0].organization_id}
            `
        } 
    } catch (error) {
        console.log("Error fetching scheduled job")
    }
};
