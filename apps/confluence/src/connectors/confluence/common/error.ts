type ConfluenceErrorOptions = { response?: Response };

export class ConfluenceError extends Error {
  response?: Response;

  constructor(message: string, { response }: ConfluenceErrorOptions = {}) {
    super(message);
    this.response = response;
  }
}
