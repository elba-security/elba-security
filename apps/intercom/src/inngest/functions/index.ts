import { synchronizeUsers } from './users/sync-users';
import { scheduleUsersSynchronize } from './users/schedule-users-sync';
import { removeOrganisation } from './organisations/remove-organisation';

export const inngestFunctions = [removeOrganisation, synchronizeUsers, scheduleUsersSynchronize];
