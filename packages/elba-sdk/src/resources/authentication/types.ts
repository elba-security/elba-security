import type { UpdateAuthenticationObjects } from 'elba-schema';

export type AuthenticationObject = UpdateAuthenticationObjects['objects'][number];

export type AuthenticationUpdateObjectsResult = {
  success: boolean;
};
