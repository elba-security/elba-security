type MondayErrorOptions = { response?: Response };

export class MondayError extends Error {
  response?: Response;

  constructor(message: string, { response }: MondayErrorOptions = {}) {
    super(message);
    this.response = response;
  }
}
