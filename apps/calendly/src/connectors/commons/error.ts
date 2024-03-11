type CalendlyErrorOptions = { response?: Response; request?: Request };

export class CalendlyError extends Error {
  response?: Response;
  request?: Request;

  constructor(message: string, { response, request }: CalendlyErrorOptions = {}) {
    super(message);
    this.response = response;
    this.request = request;
  }
}
