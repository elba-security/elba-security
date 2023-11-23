import { redirect } from "next/navigation";
import { NextRequest, NextResponse } from "next/server";
import { getAuthUrl } from "./service";

export async function GET(req: NextRequest, res: NextResponse) {
  // getting organization_id from the params
  const organization_id = req.nextUrl.searchParams.get("organization_id");

  if (!organization_id || organization_id.length === 0) {
    return NextResponse.json("organization_id not found in the query", {
      status: 400,
    });
  }

  // redirecting user to zoom auth url
  const redirectUrl = getAuthUrl(organization_id)
  redirect(redirectUrl);
}