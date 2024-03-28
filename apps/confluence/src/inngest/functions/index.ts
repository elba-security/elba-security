import { deleteObjectPermissions } from './data-protection/delete-object-permissions';
import { deletePageRestrictions } from './data-protection/delete-page-restrictions';
import { deleteSpacePermissions } from './data-protection/delete-space-permission';
import { refreshDataProtectionObject } from './data-protection/refresh-data-protection-object';
import { scheduleDataProtectionSyncs } from './data-protection/schedule-data-protection-syncs';
import { syncPages } from './data-protection/sync-pages';
import { syncSpaces } from './data-protection/sync-spaces';
import { removeOrganisation } from './organisations/remove-organisation';
import { refreshToken } from './token/refresh-token';
import { scheduleUsersSyncs } from './users/schedule-users-syncs';
import { syncGroupUsers } from './users/sync-group-users';
import { syncUsers } from './users/sync-users';

export const inngestFunctions = [
  deleteObjectPermissions,
  deletePageRestrictions,
  deleteSpacePermissions,
  refreshDataProtectionObject,
  refreshToken,
  removeOrganisation,
  scheduleDataProtectionSyncs,
  scheduleUsersSyncs,
  syncGroupUsers,
  syncPages,
  syncSpaces,
  syncUsers,
];
