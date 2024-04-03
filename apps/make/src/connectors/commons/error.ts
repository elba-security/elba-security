type MakeErrorOptions = { response?: Response };

export class MakeError extends Error {
  response?: Response;

  constructor(message: string, { response }: MakeErrorOptions = {}) {
    super(message);
    this.response = response;
  }
}
