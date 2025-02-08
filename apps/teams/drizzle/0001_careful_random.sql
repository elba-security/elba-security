ALTER TABLE "subscriptions" DROP CONSTRAINT "subscriptions_organisation_id_organisations_id_fk";
ALTER TABLE "channels" DROP CONSTRAINT "channels_pkey";--> statement-breakpoint
ALTER TABLE "channels" ADD CONSTRAINT "channels_id_organisation_id_pk" PRIMARY KEY("id","organisation_id");--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN "tenant_id" text NOT NULL;--> statement-breakpoint
ALTER TABLE "channels" DROP COLUMN IF EXISTS "channel_id";--> statement-breakpoint
ALTER TABLE "subscriptions" DROP COLUMN IF EXISTS "organisation_id";
