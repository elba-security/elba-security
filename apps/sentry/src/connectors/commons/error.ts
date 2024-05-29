type SentryErrorOptions = { response?: Response };

export class SentryError extends Error {
  response?: Response;

  constructor(message: string, { response }: SentryErrorOptions = {}) {
    super(message);
    this.response = response;
  }
}
