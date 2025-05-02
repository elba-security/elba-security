import { type AllAuthCredentials, type Connection } from '@nangohq/types';
import { IntegrationConnectionError } from '@elba-security/common';
import { NangoConnectionError } from './error';
import { type CredentialsAuthTypes, type ConnectionType } from './types';

export class NangoAPIClient {
  integrationId: string;
  host: string;
  #secretKey: string;

  constructor({
    integrationId,
    secretKey,
    host = 'api.nango.dev',
  }: {
    secretKey: string;
    integrationId: string;
    host?: string;
  }) {
    this.integrationId = integrationId;
    this.host = host;
    this.#secretKey = secretKey;
  }

  public getConnection = async <CredentialsType extends CredentialsAuthTypes>(
    connectionId: string,
    type: CredentialsType
  ): Promise<ConnectionType<CredentialsType>> => {
    const response = await fetch(
      `https://${this.host}/connection/${connectionId}?provider_config_key=${this.integrationId}`,
      {
        headers: { Authorization: `Bearer ${this.#secretKey}` },
      }
    );

    if (!response.ok) {
      if (response.status === 404) {
        throw new IntegrationConnectionError('Nango connection not found', {
          type: 'unauthorized',
        });
      }

      throw new NangoConnectionError('Failed to retrieve Nango connection', { response });
    }

    const connection = (await response.json()) as Connection;

    const { credentials, ...connectionData } = connection;
    if (!this.isCredentialType(credentials, type)) {
      throw new Error('Invalid credentials type');
    }

    return { ...connectionData, credentials };
  };

  public isCredentialType = <
    Credentials extends AllAuthCredentials,
    Type extends CredentialsAuthTypes,
  >(
    credentials: Credentials,
    type: Type
  ): credentials is Extract<Credentials, { type: Type }> => {
    return credentials.type === type;
  };
}
