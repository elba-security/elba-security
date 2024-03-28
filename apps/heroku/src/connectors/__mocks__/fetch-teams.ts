import { type HerokuTeam } from '../types';

export const teams: HerokuTeam[] = [
  {
    id: 'team-id',
    created_at: 'created-at-time',
    name: 'team-name',
    updated_at: 'updated-at-time',
    permissions: ['view'],
    trial: false,
    identity_provider: {
      id: 'idp-id',
      name: 'idp-name',
      owner: {
        id: 'owner-id',
        name: 'owner-name',
        type: 'enterprise-account',
      },
    },
  },
];
