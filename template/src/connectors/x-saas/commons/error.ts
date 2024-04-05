type XSaasErrorOptions = { response?: Response };

export class XSaasError extends Error {
  response?: Response;

  constructor(message: string, { response }: XSaasErrorOptions = {}) {
    super(message);
    this.response = response;
  }
}
