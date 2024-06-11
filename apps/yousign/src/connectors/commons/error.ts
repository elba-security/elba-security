type YousignErrorOptions = { response?: Response; request?: Request };

export class YousignError extends Error {
  response?: Response;
  request?: Request;

  constructor(message: string, { response, request }: YousignErrorOptions = {}) {
    super(message);
    this.response = response;
    this.request = request;
  }
}
