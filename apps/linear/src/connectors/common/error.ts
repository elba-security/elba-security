type LinearErrorOptions = { response?: Response };

export class LinearError extends Error {
  response?: Response;

  constructor(message: string, { response }: LinearErrorOptions = {}) {
    super(message);
    this.response = response;
  }
}
