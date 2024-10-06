import { text } from 'drizzle-orm/pg-core';
import { type ElbaConfig } from '@elba-security/next-elba/config';
import { env } from './env';
import { getRefreshToken, getToken } from './connectors/auth';
import { deleteUser, getAuthUser, getUsers } from './connectors/users';

const organisationsTableColumns = {
  accessToken: text('access_token').notNull(),
  refreshToken: text('refresh_token').notNull(),
  organizationUri: text('organization_uri').notNull(),
  authUserUri: text('auth_user_uri').notNull(),
} as const;

const installationUrl = new URL(`${env.CALENDLY_APP_INSTALL_URL}/authorize`);
installationUrl.searchParams.append('response_type', 'code');
installationUrl.searchParams.append('client_id', env.CALENDLY_CLIENT_ID);
installationUrl.searchParams.append('redirect_uri', env.CALENDLY_REDIRECT_URI);

export const config: ElbaConfig<typeof organisationsTableColumns> = {
  name: 'calendly',
  database: {
    organisations: organisationsTableColumns,
  },
  oauth: {
    installationUrl: installationUrl.toString(),
    authorize: async (code) => {
      const result = await getToken(code);
      const { authUserUri } = await getAuthUser(result.accessToken);
      return {
        ...result,
        authUserUri,
      };
    },
    refresh: ({ refreshToken }) => getRefreshToken(refreshToken),
  },
  users: {
    deleteUser: ({ accessToken }, userId) => deleteUser({ userId, accessToken }),
    getUsers: ({ accessToken, organizationUri, authUserUri }, cursor) =>
      getUsers({ accessToken, cursor, organizationUri, authUserUri }),
  },
};
