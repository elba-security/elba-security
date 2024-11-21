import { type Connection } from '@nangohq/types';

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
      throw new Error('Failed to retrieve Nango connection error');
    }

    const body: Connection = await response.json();

    return body;
  };
}
