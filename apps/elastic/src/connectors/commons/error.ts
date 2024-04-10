type ElasticErrorOptions = { response?: Response; request?: Request };

export class ElasticError extends Error {
  response?: Response;
  request?: Request;

  constructor(message: string, { response, request }: ElasticErrorOptions = {}) {
    super(message);
    this.response = response;
    this.request = request;
  }
}
