import { removeOrganisation } from './organisations/remove-organisation';
import { syncUsers } from './users/sync-users';
import { scheduleUsersSync } from './users/schedule-users-sync';
import { deleteUser } from './users/delete-users';
import { syncAccountUsers } from './users/sync-account-users';

export const inngestFunctions = [
  removeOrganisation,
  scheduleUsersSync,
  syncUsers,
  deleteUser,
  syncAccountUsers,
];
