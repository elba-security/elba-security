type MicrosoftOptions = { response?: Response };

export class MicrosoftError extends Error {
  response?: Response;

  constructor(message: string, { response }: MicrosoftOptions = {}) {
    super(message);
    this.response = response;
  }
}
