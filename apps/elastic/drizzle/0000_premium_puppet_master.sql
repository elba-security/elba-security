CREATE TABLE IF NOT EXISTS "organisations" (
	"id" uuid PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"region" text NOT NULL,
	"api_key" text NOT NULL
);
