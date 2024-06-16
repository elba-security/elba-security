type CalendlyErrorOptions = { response?: Response };

export class CalendlyError extends Error {
  response?: Response;

  constructor(message: string, { response }: CalendlyErrorOptions = {}) {
    super(message);
    this.response = response;
  }
}
