import {
  type NangoAPIClient,
  type ConnectionType,
  type CredentialsAuthTypes,
} from '@elba-security/nango';

export const getNangoConnection = async <AuthType extends CredentialsAuthTypes>({
  nangoClient,
  nangoAuthType,
  nangoConnectionId,
}: {
  nangoClient: NangoAPIClient | null;
  nangoAuthType: AuthType | null;
  nangoConnectionId: string | null;
}): Promise<ConnectionType<AuthType> | undefined> => {
  if (!nangoClient) {
    return;
  }

  if (!nangoConnectionId || !nangoAuthType) {
    throw new Error('No Nango connection ID nor auth type provided');
  }

  return nangoClient.getConnection(nangoConnectionId, nangoAuthType);
};
