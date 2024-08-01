type ElasticErrorOptions = { response?: Response };

export class ElasticError extends Error {
  response?: Response;

  constructor(message: string, { response }: ElasticErrorOptions = {}) {
    super(message);
    this.response = response;
  }
}
