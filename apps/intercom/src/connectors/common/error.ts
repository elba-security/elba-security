type IntercomErrorOptions = { response?: Response };

export class IntercomError extends Error {
  response?: Response;

  constructor(message: string, { response }: IntercomErrorOptions = {}) {
    super(message);
    this.response = response;
  }
}
