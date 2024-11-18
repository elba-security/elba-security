type CheckrErrorOptions = { response?: Response; request?: Request };

export class CheckrError extends Error {
  response?: Response;
  request?: Request;

  constructor(message: string, { response, request }: CheckrErrorOptions = {}) {
    super(message);
    this.response = response;
    this.request = request;
  }
}
