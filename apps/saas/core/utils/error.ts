type IntegrationErrorOptions = { response?: Response };

export class IntegrationError extends Error {
  response?: Response;

  constructor(message: string, { response }: IntegrationErrorOptions = {}) {
    super(message);
    this.response = response;
  }
}
