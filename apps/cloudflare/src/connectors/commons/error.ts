type CloudflareErrorOptions = { response?: Response };

export class CloudflareError extends Error {
  response?: Response;

  constructor(message: string, { response }: CloudflareErrorOptions = {}) {
    super(message);
    this.response = response;
  }
}
