type BitbucketErrorOptions = { response?: Response };

export class BitbucketError extends Error {
  response?: Response;

  constructor(message: string, { response }: BitbucketErrorOptions = {}) {
    super(message);
    this.response = response;
    this.name = 'BitbucketError';
  }
}
