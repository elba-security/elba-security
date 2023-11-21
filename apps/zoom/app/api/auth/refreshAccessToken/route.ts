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

export async function POST(req: NextRequest, res: NextResponse) {
  // for refreshing access token, fetching data from body
  const bodyData = await req.json();

  const refresh_token = bodyData.refresh_token;
  const organization_id = bodyData.organization_id;

  if (!refresh_token || refresh_token.length === 0) {
    return NextResponse.json("refresh_token not found in the query", {
      status: 400,
    });
  }

  if (!organization_id || organization_id.length === 0) {
    return NextResponse.json("organization_id not found in the query", {
      status: 400,
    });
  }

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

  try {
    // getting user matching the following parameters
    const getExistingUser = await sql`
        SELECT * FROM zoom_credentials WHERE organization_id=${organization_id} AND refresh_token=${refresh_token};
    `;
    if (getExistingUser && getExistingUser.rows.length > 0) {
      const base64EncodedBody = Buffer.from(
        `${getZoomCredentials().clientId}:${getZoomCredentials().clientSecret}`
      ).toString("base64");

      const data = encodeURI(
        `grant_type=authorization_code&refresh_token=${refresh_token}&redirect_uri=${
          getZoomCredentials().clientRedirectUrl +
          "?organization_id=" +
          organization_id
        }`
      );

      // requesting new refresh token based on the previous refresh token
      const response = await axios.post("https://zoom.us/oauth/token", data, {
        headers: {
          Authorization: `Basic ${base64EncodedBody}`,
          "Content-Type": "application/x-www-form-urlencoded",
          "Content-Length": Buffer.byteLength(data),
        },
      });

      // updating user tokens
      const userData = response.data as AccessTokenResponseType;
      await sql`
            UPDATE zoom_credentials 
            SET
                access_token=${userData.access_token},
                refresh_token=${userData.refresh_token},
                expires_in=${userData.expires_in},
                token_type=${userData.token_type},
                scope=${userData.scope}
            WHERE organization_id=${organization_id}; `;

      return NextResponse.json("Updated refresh token", { status: 200 });
    }
  } catch (error) {
    return NextResponse.json(error, { status: 400 });
  }
}
