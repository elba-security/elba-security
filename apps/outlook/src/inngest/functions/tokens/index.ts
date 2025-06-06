import { refreshToken, type RefreshTokenEvents } from './refresh-token';
import { scheduleTokenRefresh } from './schedule-token-refresh';

export type TokenEvents = RefreshTokenEvents;

export const tokenFunctions = [refreshToken, scheduleTokenRefresh];
