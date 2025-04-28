import { type AllAuthCredentials, type Connection } from '@nangohq/types';
import { IntegrationConnectionError } from '@elba-security/common';
import { NangoConnectionError } from './error';

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

  public getConnection = async (connectionId: string) => {
    const response = await fetch(
      `https://${this.host}/connection/${connectionId}?provider_config_key=${this.integrationId}`,
      {
        headers: { Authorization: `Bearer ${this.#secretKey}` },
      }
    );

    if (!response.ok) {
      if (response.status === 404) {
        throw new IntegrationConnectionError('Nango connection not found', {
          response,
          type: 'unauthorized',
        });
      }

      throw new NangoConnectionError('Failed to retrieve Nango connection', { response });
    }

    const body: Connection = await response.json();

    return body;
  };

  public getCredentials = async (connectionId: string, type: AllAuthCredentials['type']) => {
    const { credentials } = await this.getConnection(connectionId);

    if (!this.isCredentialType(credentials, type)) {
      throw new Error('Invalid credentials type');
    }

    return credentials;
  };

  public isCredentialType = <
    Credentials extends AllAuthCredentials,
    Type extends AllAuthCredentials['type'],
  >(
    credentials: Credentials,
    type: Type
  ): credentials is Extract<Credentials, { type: Type }> => {
    return credentials.type === type;
  };
}
