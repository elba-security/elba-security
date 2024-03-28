import { and, eq, lt } from 'drizzle-orm';
import { db } from '@/database/client';
import { usersTable } from '@/database/schema';
import type { ConfluenceGroupMember } from '@/connectors/confluence/groups';

export const getOrganisationUsers = async (organisationId: string) => {
  const rows = await db
    .select({
      id: usersTable.id,
      lastSyncAt: usersTable.lastSyncAt,
      publicName: usersTable.publicName,
      displayName: usersTable.displayName,
    })
    .from(usersTable)
    .where(eq(usersTable.organisationId, organisationId));

  const users = new Map<string, (typeof rows)[number]>();
  for (const row of rows) {
    users.set(row.id, row);
  }

  return users;
};

type UpdateUsersParams = {
  users: ConfluenceGroupMember[];
  organisationId: string;
  syncStartedAt: number;
};

export const updateUsers = async ({ users, organisationId, syncStartedAt }: UpdateUsersParams) => {
  await db
    .insert(usersTable)
    .values(
      users.map((user) => ({
        id: user.accountId,
        displayName: user.displayName,
        publicName: user.publicName,
        organisationId,
        lastSyncAt: new Date(syncStartedAt),
      }))
    )
    .onConflictDoNothing();
};

export type DeleteUsersParams = {
  organisationId: string;
  syncStartedAt: number;
};

export const deleteUsers = ({ organisationId, syncStartedAt }: DeleteUsersParams) =>
  db
    .delete(usersTable)
    .where(
      and(
        eq(usersTable.organisationId, organisationId),
        lt(usersTable.lastSyncAt, new Date(syncStartedAt))
      )
    );
