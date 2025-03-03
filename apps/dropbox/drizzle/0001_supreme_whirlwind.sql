-- First drop the foreign key constraint
ALTER TABLE shared_links DROP CONSTRAINT shared_links_organisation_id_organisations_id_fk;
-- Then drop the table
DROP TABLE organisations;