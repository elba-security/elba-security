/*
  Warnings:

  - Added the required column `integration_id` to the `Users_Sync_Jobs` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Users_Sync_Jobs" ADD COLUMN     "integration_id" INTEGER NOT NULL;
