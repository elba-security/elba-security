type AsanaErrorOptions = { response?: Response };

export class AsanaError extends Error {
  response?: Response;

  constructor(message: string, { response }: AsanaErrorOptions = {}) {
    super(message);
    this.response = response;
  }
}
