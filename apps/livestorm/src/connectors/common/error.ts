type LivestormErrorOptions = { response?: Response };

export class LivestormError extends Error {
  response?: Response;

  constructor(message: string, { response }: LivestormErrorOptions = {}) {
    super(message);
    this.response = response;
  }
}
