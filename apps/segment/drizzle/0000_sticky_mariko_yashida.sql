CREATE TABLE IF NOT EXISTS "organisations" (
	"id" uuid PRIMARY KEY NOT NULL,
	"api_key" text NOT NULL,
	"region" text NOT NULL,
	"workspace_name" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
