CREATE TABLE IF NOT EXISTS "organisations" (
	"id" uuid PRIMARY KEY NOT NULL,
	"region" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"access_token" text NOT NULL,
	"refresh_token" text NOT NULL,
	"organization_uri" text NOT NULL
);
