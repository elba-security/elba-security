import { getZoomCredentials } from "@/lib/auth";
import { sql } from "@vercel/postgres";
import axios, { AxiosError } from "axios";
import { redirect } from "next/navigation";
import { NextRequest, NextResponse } from "next/server";

type AccessTokenResponseType = {
  access_token: string;
  token_type: string;
  refresh_token: string;
  expires_in: number;
  scope: string;
};

export async function GET(req: NextRequest, res: NextResponse) {
  // get params
  const authorization_code = req.nextUrl.searchParams.get("code");
  const organization_id = req.nextUrl.searchParams.get("organization_id");

  if (!authorization_code || authorization_code.length === 0) {
    return NextResponse.json("authorization 'code' not found in the query", { status: 400 });
  }

  if (!organization_id || organization_id.length === 0) {
    return NextResponse.json("organization_id not found in the query", {
      status: 400,
    });
  }

  try {
    // converting credentials for zoom
    const base64EncodedBearer = Buffer.from(
      `${getZoomCredentials().clientId}:${getZoomCredentials().clientSecret}`
    ).toString("base64");

    const data = encodeURI(
      `grant_type=authorization_code&code=${authorization_code}&redirect_uri=${getZoomCredentials().clientRedirectUrl +
      "?organization_id=" +
      organization_id
      }`
    );

    // getting access_token while providing authorization "Code"
    const response = await axios.post("https://zoom.us/oauth/token", data, {
      headers: {
        Authorization: `Basic ${base64EncodedBearer}`,
        "Content-Type": "application/x-www-form-urlencoded",
        "Content-Length": Buffer.byteLength(data),
      },
    });

    const userData = response.data as AccessTokenResponseType;

    // create table if not exist
    try {
      await sql`
      CREATE TABLE IF NOT EXISTS
        zoom_credentials ( 
          id SERIAL PRIMARY KEY, 
          organization_id VARCHAR(1000) NOT NULL, 
          access_token VARCHAR(5000) NOT NULL, 
          refresh_token VARCHAR(5000) NOT NULL, 
          expires_in INT NOT NULL,
          token_type VARCHAR(500) NOT NULL,
          scope VARCHAR(500) NOT NULL
        )
    `;
    } catch (error) {
      console.log(error);
      return NextResponse.json("Error creating table for credentials", {
        status: 500,
      });
    }

    //save the user access_token and relevant data to the table
    try {
      const getExistingUser = await sql`
        SELECT * FROM zoom_credentials WHERE organization_id=${organization_id} AND access_token=${userData.access_token};
    `;
      if (getExistingUser && getExistingUser.rows.length > 0) {
        await sql`
            UPDATE zoom_credentials 
            SET
                access_token=${userData.access_token},
                refresh_token=${userData.refresh_token},
                expires_in=${userData.expires_in},
                token_type=${userData.token_type},
                scope=${userData.scope}
            WHERE organization_id=${organization_id} AND access_token=${userData.access_token}
        `;
        return NextResponse.json("Updated user information", { status: 200 });
      } else {
        await sql`
            INSERT INTO zoom_credentials (
                access_token,
                refresh_token,
                expires_in,
                token_type,
                scope,
                organization_id
            )
            VALUES (
                ${userData.access_token},
                ${userData.refresh_token},
                ${userData.expires_in},
                ${userData.token_type},
                ${userData.scope},
                ${organization_id}
            )
        `;
        return NextResponse.json("Created user information", { status: 200 });
      }
    } catch (error) {
      return NextResponse.json("Something went wrong calling Postgres", { status: 400 });
    }
  } catch (error: any) {
    return Response.json("Error fetching auth token from zoom, either the token is expired or not present", { status: 400 });
  }
}
