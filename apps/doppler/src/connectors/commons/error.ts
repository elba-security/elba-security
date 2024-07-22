type DopplerErrorOptions = { response?: Response; request?: Request };

export class DopplerError extends Error {
  response?: Response;
  request?: Request;

  constructor(message: string, { response, request }: DopplerErrorOptions = {}) {
    super(message);
    this.response = response;
    this.request = request;
  }
}
