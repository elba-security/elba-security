type ConnectorErrorOptions = { response?: Response };

export class ConnectorError extends Error {
  response?: Response;

  constructor(message: string, { response }: ConnectorErrorOptions = {}) {
    super(message);
    this.response = response;
  }
}
