type YousignErrorOptions = { response?: Response };

export class YousignError extends Error {
  response?: Response;

  constructor(message: string, { response }: YousignErrorOptions = {}) {
    super(message);
    this.response = response;
  }
}
