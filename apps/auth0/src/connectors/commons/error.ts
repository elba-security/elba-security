type Auth0ErrorOptions = { response?: Response; request?: Request };

export class Auth0Error extends Error {
  response?: Response;
  request?: Request;

  constructor(message: string, { response, request }: Auth0ErrorOptions = {}) {
    super(message);
    this.response = response;
    this.request = request;
  }
}
