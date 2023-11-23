import { sql } from "@vercel/postgres";
import axios from "axios";
import { userSyncJobsTable } from "../user-sync-table";

export const runUsersSyncJob = async () => {
    const ELBA_API_BASE_URL = process.env.ELBA_API_BASE_URL

    if (!ELBA_API_BASE_URL || ELBA_API_BASE_URL.length === 0) {
        return {
            success: false,
            error: "Missing ELBA_API_BASE_URL"
        }
    }

    const ELBA_SOURCE_ID = process.env.ELBA_SOURCE_ID

    if (!ELBA_SOURCE_ID || ELBA_SOURCE_ID.length === 0) {
        return {
            success: false,
            error: "Missing ELBA_SOURCE_ID"
        }
    }

    // creating table (for dev) if it doesn't exist
    try {
        await userSyncJobsTable();
    } catch (error: any) {
        return {
            success: false,
            error: error.message
        };
    }

    const PLACEHOLDER_TOKEN = "";

    try {
        //get first scheduled job
        const firstScheduledJob = await sql`SELECT * FROM users_sync_jobs WHERE status='scheduled' LIMIT 1`
        if (firstScheduledJob.rowCount > 0) {
            // get users under the same organization_id
            const BATCH_SIZE = parseInt(process.env.USERS_SYNC_JOB_BATCH_SIZE || "5") || firstScheduledJob.rows[0].batchSize || 5;
            const PAGE_NUMBER = firstScheduledJob.rows[0].isFirstSync ? 0 : firstScheduledJob.rows[0].pageNumber;
            const PAGINATION_TOKEN = firstScheduledJob.rows[0].isFirstSync ? undefined : firstScheduledJob.rows[0].paginationToken;

            try {
                //fetch users from zoom based on org id
                const zoomResponse = await axios.get('https://api.zoom.us/v2/users', {
                    data: {
                        page_size: BATCH_SIZE,
                        page_number: PAGE_NUMBER,
                        next_page_token: PAGINATION_TOKEN
                    },
                    headers: {
                        Authorization: `Bearer ${PLACEHOLDER_TOKEN}`,
                    },
                });

                const { next_page_token, page_number, users } = zoomResponse.data;

                const usersList: {
                    id: string;
                    email: string;
                    displayName: string;
                    additionalEmails: string[]
                }[] = [];

                users.forEach((user: any) => {
                    usersList.push({
                        id: user.id,
                        email: user.email,
                        displayName: user.display_name,
                        additionalEmails: []
                    })
                });

                //update users to elba endpoint
                try {
                    await axios.post(`${process.env.ELBA_API_BASE_URL}/api/rest/users`, {
                        sourceId: ELBA_SOURCE_ID,
                        organizationId: firstScheduledJob.rows[0].organization_id,
                        users: users
                    });
                } catch (error) {
                    throw new Error("Failed to update Users to Elba")
                }

                //delete users if no pagination token is present
                if (!next_page_token) {
                    //elba delete api call
                    try {
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
                    } catch (error) {
                        throw new Error("Failed to delete users from Elba")
                    }

                    //delete the scheduled job, or mark it completed
                    try {
                        await sql`
                        DELETE FROM users_sync_jobs 
                        WHERE 
                            organization_id=${firstScheduledJob.rows[0].organization_id} 
                            AND id=${firstScheduledJob.rows[0].id}
                    `
                    } catch (error) {
                        throw new Error("Error deleting scheduled job")
                    }
                } else {
                    // we have more pagination items, updating the original job
                    const updateObject = {
                        isFirstSync: false,
                        pageNumber: page_number,
                        paginationToken: next_page_token,
                        updatedAt: new Date().toISOString()
                    }
                    await sql`
                        UPDATE users_sync_jobs
                        SET 
                            isFirstSync=${updateObject.isFirstSync},
                            pageNumber=${updateObject.pageNumber},
                            updatedAt=${updateObject.updatedAt},
                            paginationToken=${updateObject.paginationToken}
                        WHERE 
                            organization_id=${firstScheduledJob.rows[0].organization_id} 
                            AND id=${firstScheduledJob.rows[0].id}
                    `
                }

                return {
                    success: true,
                    data: usersList
                }
            } catch (error) {
                const updateObject = {
                    retries: firstScheduledJob.rows[0].retries + 1,
                    isFirstSync: false,
                    pageNumber: PAGE_NUMBER,
                    updatedAt: new Date().toISOString()
                }
                await sql`
                UPDATE users_sync_jobs
                SET 
                    retries=${updateObject.retries},
                    isFirstSync=${updateObject.isFirstSync},
                    updatedAt=${updateObject.updatedAt},
                    pageNumber=${updateObject.pageNumber}
                WHERE organization_id=${firstScheduledJob.rows[0].organization_id}
            `
                throw new Error("Failed to call zoom api to fetch users")
            }
        } else {
            throw new Error("No scheduled job found")
        }
    } catch (error: any) {
        console.log(error)
        if(error.message) {
            return {
                success: false,
                error: error.message
            }
        } else {
            return {
                success: false,
                error: "Error fetching scheduled job"
            }
        }
    }
};
