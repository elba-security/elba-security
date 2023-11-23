import { getZoomCredentials } from "@/lib/auth";

// creating auth url for the user to redirect to
export const getAuthUrl = (organization_id: string) => {
    const makeUrl = new URL("https://zoom.us/oauth/authorize");
    makeUrl.searchParams.set("response_type", "code");
    makeUrl.searchParams.set(
        "redirect_uri",
        getZoomCredentials().clientRedirectUrl +
        "?organization_id=" +
        organization_id
    );
    makeUrl.searchParams.set("client_id", getZoomCredentials().clientId);
    return makeUrl.href;
};