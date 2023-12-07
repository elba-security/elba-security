type AsanaErrorOptions = { response?: Response; cause?: unknown };

export class AsanaError extends Error {
  response?: Response;

  constructor(message: string, { response, cause }: AsanaErrorOptions = {}) {
    super(message, { cause });
    this.response = response;
  }
}
