type FivetranErrorOptions = { response?: Response; request?: Request };

export class FivetranError extends Error {
  response?: Response;
  request?: Request;

  constructor(message: string, { response, request }: FivetranErrorOptions = {}) {
    super(message);
    this.response = response;
    this.request = request;
  }
}
