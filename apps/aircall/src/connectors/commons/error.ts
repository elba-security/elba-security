type AircallErrorOptions = { response?: Response };

export class AircallError extends Error {
  response?: Response;

  constructor(message: string, { response }: AircallErrorOptions = {}) {
    super(message);
    this.response = response;
  }
}
