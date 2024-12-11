export class NangoConnectionError extends Error {
  readonly response: Response;
  constructor(
    message: string,
    { response, ...opts }: Parameters<ErrorConstructor>[1] & { response: Response }
  ) {
    super(message, opts);
    this.name = 'NangoConnectionError';
    this.response = response;
  }
}
