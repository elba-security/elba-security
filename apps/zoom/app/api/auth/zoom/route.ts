import { getZoomCredentials } from "@/lib/auth";
import { redirect } from "next/navigation";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest, res: NextResponse) {
  // getting organization_id from the params
  const organization_id = req.nextUrl.searchParams.get("organization_id");

  if (!organization_id || organization_id.length === 0) {
    return NextResponse.json("organization_id not found in the query", {
      status: 400,
    });
  }

  // creating auth url for the user to redirect to
  const getAuthUrl = () => {
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

  // redirecting user to zoom auth url
  redirect(getAuthUrl());
}
