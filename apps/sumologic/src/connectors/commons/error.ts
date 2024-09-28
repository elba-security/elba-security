type SumologicErrorOptions = { response?: Response; request?: Request };

export class SumologicError extends Error {
  response?: Response;
  request?: Request;

  constructor(message: string, { response, request }: SumologicErrorOptions = {}) {
    super(message);
    this.response = response;
    this.request = request;
  }
}
