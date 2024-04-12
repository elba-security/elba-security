CREATE TABLE IF NOT EXISTS "organisation" (
	"id" uuid PRIMARY KEY NOT NULL,
	"region" text NOT NULL,
	"accessToken" text NOT NULL,
	"refreshToken" text NOT NULL
);
