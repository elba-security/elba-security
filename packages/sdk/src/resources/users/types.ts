import type { UpdateUsers } from '@elba-security/schemas';

export type User = UpdateUsers['users'][number];

export type UserUpdateResult = {
  success: boolean;
};

export type UserDeleteResult = {
  success: boolean;
};
