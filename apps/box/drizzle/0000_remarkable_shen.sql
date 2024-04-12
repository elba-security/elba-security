CREATE TABLE IF NOT EXISTS "organisations" (
	"id" uuid PRIMARY KEY NOT NULL,
	"region" text NOT NULL,
	"accessToken" text NOT NULL,
	"refreshToken" text NOT NULL
);
