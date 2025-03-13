import { refreshToken } from '@/inngest/functions/tokens/refresh-token';
import { scheduleTokenRefresh } from './schedule-token-refresh';

export const tokenFunctions = [refreshToken, scheduleTokenRefresh];
