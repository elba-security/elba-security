import { removeOrganisation } from './organisations/remove-organisation';
import { deleteApolloUser } from './users/delete.user';
import { scheduleUsersSyncs } from './users/schedule-users-syncs';
import { syncUsersPage } from './users/sync-users-page';

export const inngestFunctions = [syncUsersPage,scheduleUsersSyncs,deleteApolloUser,removeOrganisation];
