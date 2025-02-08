type AirslateErrorOptions = { response?: Response };

export class AirslateError extends Error {
  response?: Response;

  constructor(message: string, { response }: AirslateErrorOptions = {}) {
    super(message);
    this.response = response;
  }
}
