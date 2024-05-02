type ZoomErrorOptions = { response?: Response };

export class ZoomError extends Error {
  response?: Response;

  constructor(message: string, { response }: ZoomErrorOptions = {}) {
    super(message);
    this.response = response;
  }
}
