import type { UpdateAuthenticationObjects } from '@elba-security/schemas';

export type AuthenticationObject = UpdateAuthenticationObjects['objects'][number];

export type AuthenticationUpdateObjectsResult = {
  success: boolean;
};
