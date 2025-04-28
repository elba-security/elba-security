import {
  type NangoAPIClient,
  type ConnectionType,
  type CredentialsAuthTypes,
} from '@elba-security/nango';
import { NonRetriableError } from 'inngest';

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

  try {
    const { credentials, ...connection } = await nangoClient.getConnection(nangoConnectionId);
    if (!nangoClient.isCredentialType(credentials, nangoAuthType)) {
      throw new Error('Invalid Nango credentials type');
    }

    return { ...connection, credentials };
  } catch (error) {
    throw new NonRetriableError('Failed to retrieve Nango access token', { cause: error });
  }
};
