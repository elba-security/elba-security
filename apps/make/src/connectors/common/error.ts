type MakeErrorOptions = { response?: Response; request?: Request };

export class MakeError extends Error {
  response?: Response;
  request?: Request;

  constructor(message: string, { response, request }: MakeErrorOptions = {}) {
    super(message);
    this.response = response;
    this.request = request;
  }
}
