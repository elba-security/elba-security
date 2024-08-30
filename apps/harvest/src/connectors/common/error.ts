type HarvestErrorOptions = { response?: Response };

export class HarvestError extends Error {
  response?: Response;

  constructor(message: string, { response }: HarvestErrorOptions = {}) {
    super(message);
    this.response = response;
  }
}
