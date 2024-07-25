type LaunchdarklyErrorOptions = { response?: Response; request?: Request };

export class LaunchdarklyError extends Error {
  response?: Response;
  request?: Request;

  constructor(message: string, { response, request }: LaunchdarklyErrorOptions = {}) {
    super(message);
    this.response = response;
    this.request = request;
  }
}
