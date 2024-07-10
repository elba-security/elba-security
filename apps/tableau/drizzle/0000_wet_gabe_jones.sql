CREATE TABLE IF NOT EXISTS "organisations" (
	"id" uuid PRIMARY KEY NOT NULL,
	"region" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"client_id" text NOT NULL,
	"secret_id" text NOT NULL,
	"secret" text NOT NULL,
	"email" text NOT NULL,
	"site_id" text NOT NULL,
	"domain" text NOT NULL,
	"token" text NOT NULL,
	"content_url" text NOT NULL
);
