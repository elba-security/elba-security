type SendgridErrorOptions = { response?: Response; request?: Request };

export class SendgridError extends Error {
  response?: Response;
  request?: Request;

  constructor(message: string, { response, request }: SendgridErrorOptions = {}) {
    super(message);
    this.response = response;
    this.request = request;
  }
}
