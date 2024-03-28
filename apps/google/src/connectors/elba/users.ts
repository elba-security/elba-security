import type { User } from '@elba-security/sdk';
import type { GoogleUser } from '../google/users';

export const formatUser = (user: GoogleUser): User => {
  return {
    id: user.id,
    displayName: user.name.fullName || user.primaryEmail,
    email: user.primaryEmail,
    additionalEmails: (user.emails || []).map(({ address }) => address),
    authMethod: user.isEnrolledIn2Sv ? 'mfa' : 'password',
  };
};
