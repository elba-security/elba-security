import exp from "constants";

export function getClientAuthorizationUrl() {
    return process.env.NEXT_PUBLIC_NOTION_CLIENT_AUTHORIZATION_URL;
}

export function getNotionInfo(): {
    notionClientID: string;
    notionClientSecret: string;
    notionRedirectUrl: string;
} {    
    const notionClientID = process.env.NOTION_CLIENT_ID;
    const notionClientSecret = process.env.NOTION_CLIENT_SECRET;
    const notionRedirectUrl = process.env.NOTION_CLIENT_REDIRECT_URL;

    if (!notionClientID || notionClientID.length === 0) {
        throw new Error("Missing NOTION_CLIENT_ID");
    }
    
    if (!notionClientSecret || notionClientSecret.length === 0) {
        throw new Error("Missing NOTION_CLIENT_SECRET");
    }

    if (!notionRedirectUrl || notionRedirectUrl.length === 0) {
        throw new Error("Missing NOTION_CLIENT_REDIRECT_URL");
    }

    return {notionClientID, notionClientSecret, notionRedirectUrl};
}

export function getBatchSizeForUserSync() {
    return process.env.USERS_SYNC_JOB_BATCH;
}