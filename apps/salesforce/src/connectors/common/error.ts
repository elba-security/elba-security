type SalesforceErrorOptions = { response?: Response };

export class SalesforceError extends Error {
  response?: Response;

  constructor(message: string, { response }: SalesforceErrorOptions = {}) {
    super(message);
    this.response = response;
  }
}
