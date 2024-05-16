CREATE TABLE IF NOT EXISTS "organisation" (
	"id" uuid PRIMARY KEY NOT NULL,
	"region" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"auth_email" text NOT NULL,
	"auth_key" text NOT NULL
);
