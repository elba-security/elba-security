import { synchronizeUsers } from './users/synchronize-users';
import { scheduleUsersSynchronize } from './users/schedule-users-synchronize';
import { refreshSaaSToken } from './users/refresh-token';
import { refreshTimeZone } from './users/refresh-timezone';
import { scheduleTimeZoneRefresh } from './users/schedule-timezone-refresh';

export const inngestFunctions = [
    synchronizeUsers,
    scheduleUsersSynchronize,
    refreshSaaSToken,
    refreshTimeZone,
    scheduleTimeZoneRefresh,
];
