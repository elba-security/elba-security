type FrontErrorOptions = { response?: Response };

export class FrontError extends Error {
  response?: Response;

  constructor(message: string, { response }: FrontErrorOptions = {}) {
    super(message);
    this.response = response;
  }
}
