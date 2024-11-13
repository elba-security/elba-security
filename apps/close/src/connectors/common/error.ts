type CloseErrorOptions = { response?: Response };

export class CloseError extends Error {
  response?: Response;

  constructor(message: string, { response }: CloseErrorOptions = {}) {
    super(message);
    this.response = response;
  }
}
