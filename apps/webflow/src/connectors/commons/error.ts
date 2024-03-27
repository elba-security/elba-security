type WebflowErrorOptions = { response?: Response; request?: Request };

export class WebflowError extends Error {
  response?: Response;
  request?: Request;

  constructor(message: string, { response, request }: WebflowErrorOptions = {}) {
    super(message);
    this.response = response;
    this.request = request;
  }
}
