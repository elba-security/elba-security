import { synchronizeUsers } from './users/synchronize-users';
import { scheduleUsersSynchronize } from './users/schedule-users-synchronize';
import { refreshSaaSToken } from './users/refresh-token';

export const inngestFunctions = [
    synchronizeUsers,
    scheduleUsersSynchronize,
    refreshSaaSToken
];
