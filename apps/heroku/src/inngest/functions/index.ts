import { syncUsers } from './users/sync-users';
import { syncTeamUsers } from './users/sync-team-users';
import { scheduleUsersSyncs } from './users/schedule-users-syncs';
import { refreshToken } from './tokens/refresh-token';
import { deleteHerokuUser } from './users/delete-user';
import { removeOrganisation } from './organisation/remove-organisation';

export const inngestFunctions = [
  syncUsers,
  syncTeamUsers,
  scheduleUsersSyncs,
  refreshToken,
  deleteHerokuUser,
  removeOrganisation,
];
