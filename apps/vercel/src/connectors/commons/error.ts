type VercelErrorOptions = { response?: Response };

export class VercelError extends Error {
  response?: Response;

  constructor(message: string, { response }: VercelErrorOptions = {}) {
    super(message);
    this.response = response;
  }
}
