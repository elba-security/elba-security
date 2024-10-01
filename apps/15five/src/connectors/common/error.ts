type FifteenFiveErrorOptions = { response?: Response; request?: Request };

export class FifteenFiveError extends Error {
  response?: Response;
  request?: Request;

  constructor(message: string, { response, request }: FifteenFiveErrorOptions = {}) {
    super(message);
    this.response = response;
    this.request = request;
  }
}
