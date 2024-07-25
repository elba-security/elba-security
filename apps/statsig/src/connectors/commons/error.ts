type StatsigErrorOptions = { response?: Response; request?: Request };

export class StatsigError extends Error {
  response?: Response;
  request?: Request;

  constructor(message: string, { response, request }: StatsigErrorOptions = {}) {
    super(message);
    this.response = response;
    this.request = request;
  }
}
