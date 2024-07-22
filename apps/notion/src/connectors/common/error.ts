type NotionErrorOptions = { response?: Response };

export class NotionError extends Error {
  response?: Response;

  constructor(message: string, { response }: NotionErrorOptions = {}) {
    super(message);
    this.response = response;
  }
}
