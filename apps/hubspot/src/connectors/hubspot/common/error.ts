type HubspotErrorOptions = { response?: Response } & ErrorOptions;

export class HubspotError extends Error {
  response?: Response;

  constructor(message: string, { response }: HubspotErrorOptions = {}) {
    super(message);
    this.response = response;
  }
}
