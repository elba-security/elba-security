CREATE TABLE IF NOT EXISTS "organisations" (
  "id" uuid PRIMARY KEY NOT NULL,
  "tenant_id" text NOT NULL,
  "region" text NOT NULL,
  "token" text NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "subscriptions" (
  "organisation_id" uuid NOT NULL,
  "user_id" text NOT NULL,
  "subscription_id" text NOT NULL,
  "subscription_expiration_date" text NOT NULL,
  "subscription_client_state" text NOT NULL,
  "delta" text NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "unic_user" UNIQUE("organisation_id", "user_id")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_organisation_id_organisations_id_fk" FOREIGN KEY ("organisation_id") REFERENCES "organisations"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

