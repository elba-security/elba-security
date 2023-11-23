export function getZoomCredentials(): {
  clientId: string;
  clientSecret: string;
  clientRedirectUrl: string;
} {
  try {
    const clientId = process.env.ZOOM_CLIENT_ID;
    const clientSecret = process.env.ZOOM_CLIENT_SECRET;
    const clientRedirectUrl = process.env.ZOOM_CLIENT_REDIRECT_URL;

    if (!clientId || clientId.length === 0) {
      throw new Error("Missing ZOOM_CLIENT_ID");
    }

    if (!clientSecret || clientSecret.length === 0) {
      throw new Error("Missing ZOOM_CLIENT_SECRET");
    }

    if (!clientRedirectUrl || clientRedirectUrl.length === 0) {
      throw new Error("Missing ZOOM_CLIENT_REDIRECT_URL");
    }

    return { clientId, clientSecret, clientRedirectUrl };
  } catch (error) {
    console.log(error)
    throw error
  }
}