type SentryErrorOptions = { response?: Response } & ErrorOptions;

export class SentryError extends Error {
  response?: Response;

  constructor(message: string, { response }: SentryErrorOptions = {}) {
    super(message);
    this.response = response;
  }
}
