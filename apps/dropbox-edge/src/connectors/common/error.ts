type DropboxErrorOptions = { response?: Response };

export class DropboxError extends Error {
  response?: Response;

  constructor(message: string, { response }: DropboxErrorOptions = {}) {
    super(message);
    this.response = response;
  }
}
