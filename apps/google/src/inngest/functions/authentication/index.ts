import type { RefreshAuthenticationObjectEvents } from './refresh-object';
import { refreshAuthenticationObject } from './refresh-object';

export type AuthenticationEvents = RefreshAuthenticationObjectEvents;

export const authenticationFunctions = [refreshAuthenticationObject];
