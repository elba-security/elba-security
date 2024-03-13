import { type HerokuUser } from '../types';

export const users: HerokuUser[] = [
  {
    enterprise_account: {
      id: '01234567-89ab-cdef-0123-456789abcdef',
      name: 'example',
    },
    id: '01234567-89ab-cdef-0123-456789abcdef',
    permissions: [{ name: 'view', description: 'View enterprise account members and teams.' }],
    two_factor_authentication: false,
    user: { id: '01234567-89ab-cdef-0123-456789abcdef', email: 'username@example.com' },
    identity_provider: {
      id: '01234567-89ab-cdef-0123-456789abcdef',
      name: 'idp-name',
      redacted: false,
      owner: {
        id: '01234567-89ab-cdef-0123-456789abcdef',
        name: 'owner-name',
        type: 'enterprise-account',
      },
    },
  },
];
