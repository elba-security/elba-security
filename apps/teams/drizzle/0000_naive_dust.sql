CREATE TABLE IF NOT EXISTS "organisation" (
    "id" uuid PRIMARY KEY NOT NULL,
    "access_token" text NOT NULL,
    "refresh_token" text NOT NULL,
    "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "admin" (
    "id" text PRIMARY KEY NOT NULL,
    "organisation_id" uuid NOT NULL,
    "last_sync_at" timestamp NOT NULL,
    "created_at" timestamp DEFAULT now() NOT NULL,
    CONSTRAINT "admin_organisation_id_id_unique" UNIQUE("organisation_id", "id"),
    CONSTRAINT "admin_organisation_id_organisation_id_fk" FOREIGN KEY ("organisation_id") REFERENCES "organisation"("id") ON DELETE CASCADE ON UPDATE NO ACTION
);
