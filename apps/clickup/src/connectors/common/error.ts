type ClickUpErrorOptions = { response?: Response };

export class ClickUpError extends Error {
  response?: Response;

  constructor(message: string, { response }: ClickUpErrorOptions = {}) {
    super(message);
    this.response = response;
    this.name = 'ClickUpError';
  }
}
