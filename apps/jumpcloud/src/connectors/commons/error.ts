type JumpcloudErrorOptions = { response?: Response; request?: Request };

export class JumpcloudError extends Error {
  response?: Response;
  request?: Request;

  constructor(message: string, { response, request }: JumpcloudErrorOptions = {}) {
    super(message);
    this.response = response;
    this.request = request;
  }
}
