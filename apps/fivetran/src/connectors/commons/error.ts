type FivetranErrorOptions = { response?: Response };

export class FivetranError extends Error {
  response?: Response;

  constructor(message: string, { response }: FivetranErrorOptions = {}) {
    super(message);
    this.response = response;
  }
}
