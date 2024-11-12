type PipedriveErrorOptions = { response?: Response };

export class PipedriveError extends Error {
  response?: Response;

  constructor(message: string, { response }: PipedriveErrorOptions = {}) {
    super(message);
    this.response = response;
  }
}
