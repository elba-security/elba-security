type PagerdutyErrorOptions = { response?: Response };

export class PagerdutyError extends Error {
  response?: Response;

  constructor(message: string, { response }: PagerdutyErrorOptions = {}) {
    super(message);
    this.response = response;
  }
}
