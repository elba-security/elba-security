import type { User } from '@elba-security/sdk';
import type { XSaasUser } from '../x-saas/users';

export const formatElbaUser = (user: XSaasUser): User => ({
  id: user.id,
  displayName: user.username,
  email: user.email,
  additionalEmails: [],
});
