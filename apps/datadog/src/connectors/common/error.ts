type DatadogErrorOptions = { response?: Response };

export class DatadogError extends Error {
  response?: Response;

  constructor(message: string, { response }: DatadogErrorOptions = {}) {
    super(message);
    this.response = response;
  }
}
