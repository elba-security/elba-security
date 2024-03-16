import { removeOrganisation } from './organisations/remove-organisation';
import { deleteVercelUser } from './users/delete.user';
import { scheduleUsersSyncs } from './users/schedule-users-syncs';
import { syncUsersPage } from './users/sync-users-page';

export const inngestFunctions = [syncUsersPage,scheduleUsersSyncs,deleteVercelUser,removeOrganisation];
