import { ElbaInngestClient } from '@elba-security/inngest';
import { env } from '@/common/env';
import { getUsers, getUserTags, deleteUser, validateConnection } from '@/connectors/aws-iam/users';
import type { AWSConnection } from '@/connectors/aws-iam/types';

export const elbaInngestClient = new ElbaInngestClient({
  name: 'aws-iam',
  nangoAuthType: 'BASIC',
  nangoIntegrationId: env.NANGO_INTEGRATION_ID,
  nangoSecretKey: env.NANGO_SECRET_KEY,
  sourceId: env.ELBA_SOURCE_ID,
});

elbaInngestClient.createElbaUsersSyncSchedulerFn(env.AWS_IAM_USERS_SYNC_CRON);

elbaInngestClient.createElbaUsersSyncFn(async ({ connection, cursor }) => {
   
  const credentials: AWSConnection = {
    username: connection.credentials.username,
    password: connection.credentials.password,
    region: connection.connection_config.region as string,
  };

  const result = await getUsers({
    credentials,
    marker: cursor,
  });

  const usersWithDetails = await Promise.all(
    result.validUsers.map(async (user) => {
      const tags = await getUserTags(credentials, user.UserName);
      const firstName = tags.find((tag) => tag.Key === 'firstName')?.Value || '';
      const lastName = tags.find((tag) => tag.Key === 'lastName')?.Value || '';
      const email = tags.find((tag) => tag.Key === 'email')?.Value || user.UserName;

      return {
        id: `${user.UserId}:${user.UserName}`,
        displayName: `${firstName} ${lastName}`.trim() || user.UserName,
        email,
        additionalEmails: [],
        isSuspendable: true,
        url: `https://console.aws.amazon.com/iam/home?#/users/${user.UserName}`,
      };
    })
  );

  return {
    users: usersWithDetails,
    cursor: result.nextMarker,
  };
});

elbaInngestClient.createElbaUsersDeleteFn({
  isBatchDeleteSupported: false,
  deleteUsersFn: async ({ connection, id }) => {
     
    const credentials: AWSConnection = {
      username: connection.credentials.username,
      password: connection.credentials.password,
      region: connection.connection_config.region as string,
    };

    const [_userId, userName] = id.split(':');

    if (userName) {
      await deleteUser({ credentials, userName });
    }
  },
});

elbaInngestClient.createInstallationValidateFn(async ({ connection }) => {
   
  const credentials: AWSConnection = {
    username: connection.credentials.username,
    password: connection.credentials.password,
    region: connection.connection_config.region as string,
  };

  await validateConnection(credentials);
});
