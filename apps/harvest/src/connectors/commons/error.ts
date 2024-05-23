type HarvestErrorOptions = { response?: Response; request?: Request };

export class HarvestError extends Error {
  response?: Response;
  request?: Request;

  constructor(message: string, { response, request }: HarvestErrorOptions = {}) {
    super(message);
    this.response = response;
    this.request = request;
  }
}
