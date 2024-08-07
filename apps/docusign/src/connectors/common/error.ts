type DocusignErrorOptions = { response?: Response };

export class DocusignError extends Error {
  response?: Response;

  constructor(message: string, { response }: DocusignErrorOptions = {}) {
    super(message);
    this.response = response;
    this.name = 'DocusignError';
  }
}
