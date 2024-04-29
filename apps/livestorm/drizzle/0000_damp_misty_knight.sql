CREATE TABLE IF NOT EXISTS "organisations" (
	"id" uuid PRIMARY KEY NOT NULL,
	"token" text NOT NULL,
	"region" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
