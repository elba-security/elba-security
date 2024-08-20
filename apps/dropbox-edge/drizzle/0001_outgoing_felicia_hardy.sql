DO $$ BEGIN
 ALTER TABLE "shared_links" ADD CONSTRAINT "shared_links_organisation_id_organisations_id_fk" FOREIGN KEY ("organisation_id") REFERENCES "organisations"("id") ON DELETE cascade ON UPDATE restrict;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
