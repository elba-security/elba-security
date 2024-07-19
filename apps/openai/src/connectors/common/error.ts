type OpenAiErrorOptions = { response?: Response; request?: Request };

export class OpenAiError extends Error {
  response?: Response;
  request?: Request;

  constructor(message: string, { response, request }: OpenAiErrorOptions = {}) {
    super(message);
    this.response = response;
    this.request = request;
  }
}
