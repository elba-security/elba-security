type GustoErrorOptions = { response?: Response };

export class GustoError extends Error {
  response?: Response;

  constructor(message: string, { response }: GustoErrorOptions = {}) {
    super(message);
    this.response = response;
  }
}
