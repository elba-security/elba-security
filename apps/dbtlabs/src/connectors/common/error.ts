type DbtlabsErrorOptions = { response?: Response; request?: Request };

export class DbtlabsError extends Error {
  response?: Response;
  request?: Request;

  constructor(message: string, { response, request }: DbtlabsErrorOptions = {}) {
    super(message);
    this.response = response;
    this.request = request;
  }
}
