type FrontappErrorOptions = { response?: Response };

export class FrontappError extends Error {
  response?: Response;

  constructor(message: string, { response }: FrontappErrorOptions = {}) {
    super(message);
    this.response = response;
  }
}
