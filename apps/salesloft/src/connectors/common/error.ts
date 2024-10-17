type SalesloftErrorOptions = { response?: Response };

export class SalesloftError extends Error {
  response?: Response;

  constructor(message: string, { response }: SalesloftErrorOptions = {}) {
    super(message);
    this.response = response;
  }
}
