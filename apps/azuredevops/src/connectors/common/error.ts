type AzuredevopsErrorOptions = { response?: Response };

export class AzuredevopsError extends Error {
  response?: Response;

  constructor(message: string, { response }: AzuredevopsErrorOptions = {}) {
    super(message);
    this.response = response;
    this.name = 'AzuredevopsError';
  }
}
