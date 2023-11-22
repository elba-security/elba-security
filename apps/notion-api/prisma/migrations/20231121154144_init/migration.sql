-- CreateTable
CREATE TABLE "Integration" (
    "id" SERIAL NOT NULL,
    "organization_id" TEXT NOT NULL,
    "notionToken" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "workspace_name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Integration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Users_Sync_Jobs" (
    "id" SERIAL NOT NULL,
    "priority" INTEGER NOT NULL,
    "organization_id" TEXT NOT NULL,
    "pagination_token" TEXT NOT NULL,
    "sync_started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Users_Sync_Jobs_pkey" PRIMARY KEY ("id")
);
