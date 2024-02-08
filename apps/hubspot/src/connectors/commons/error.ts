type HubspotErrorOptions = { response?: Response };

export class HubspotError extends Error {
  response?: Response;

  constructor(message: string, { response }: HubspotErrorOptions = {}) {
    super(message);
    this.response = response;
  }
}
