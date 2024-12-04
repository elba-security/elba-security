import { createRoute } from '../utils';

const path = '/organisations';

export const listOrganisations = createRoute({
  path,
  method: 'get',
  handler: () => {
    return Response.json({
      organisations: [
        {
          id: '00000000-0000-0000-0000-000000000001',
          nangoConnectionId: 'nango-connection-id',
        },
        {
          id: '00000000-0000-0000-0000-000000000002',
          nangoConnectionId: null,
        },
      ],
    });
  },
});

export const organisationsRoutes = [listOrganisations];
