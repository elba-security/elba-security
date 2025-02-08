type SumologicErrorOptions = { response?: Response };

export class SumologicError extends Error {
  response?: Response;

  constructor(message: string, { response }: SumologicErrorOptions = {}) {
    super(message);
    this.response = response;
  }
}
