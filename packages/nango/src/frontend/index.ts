import Nango, { type AuthOptions } from '@nangohq/frontend';

export class NangoFrontend {
  integrationId: string;
  client: Nango;

  constructor({ integrationId, publicKey }: { integrationId: string; publicKey: string }) {
    this.client = new Nango({ publicKey });
    this.integrationId = integrationId;
  }

  public authenticate = async (organisationId: string, options?: AuthOptions) => {
    return this.client.auth(this.integrationId, organisationId, options);
  };
}
