CREATE TABLE IF NOT EXISTS "organisations" (
	"id" uuid PRIMARY KEY NOT NULL,
	"accountId" text NOT NULL,
	"serviceToken" text NOT NULL,
	"accessUrl" text NOT NULL,
	"region" text NOT NULL
);
