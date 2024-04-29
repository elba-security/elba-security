type BoxErrorOptions = { response?: Response };

export class BoxError extends Error {
  response?: Response;

  constructor(message: string, { response }: BoxErrorOptions = {}) {
    super(message);
    this.response = response;
  }
}
