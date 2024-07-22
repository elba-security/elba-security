CREATE TABLE IF NOT EXISTS "organisations" (
	"id" uuid PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"service_token" text NOT NULL,
	"access_url" text NOT NULL,
	"region" text NOT NULL
);
