CREATE TABLE IF NOT EXISTS "organisation" (
	"id" uuid PRIMARY KEY NOT NULL,
	"name" text,
	"email" text NOT NULL,
	"access_token" text NOT NULL,
	"refresh_token" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"asana_id" text NOT NULL,
	"gid" text NOT NULL,
	"webhook_secret" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
