import { refreshToken } from './refresh-token';
import { scheduleTokenRefresh } from './schedule-token-refresh';

export const tokenFunctions = [refreshToken, scheduleTokenRefresh];
