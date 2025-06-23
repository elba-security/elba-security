CREATE TABLE IF NOT EXISTS "organisations" (
	"id" uuid PRIMARY KEY NOT NULL,
	"region" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"google_customer_id" text NOT NULL,
	"google_admin_email" text NOT NULL,
	"last_sync_started_at" timestamp
);
