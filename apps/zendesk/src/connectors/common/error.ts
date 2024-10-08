type ZendeskErrorOptions = { response?: Response };

export class ZendeskError extends Error {
  response?: Response;

  constructor(message: string, { response }: ZendeskErrorOptions = {}) {
    super(message);
    this.response = response;
  }
}
