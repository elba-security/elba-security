export type ElbaErrorOptions = {
  path?: string;
  method?: string;
  response?: Response;
  cause?: unknown;
  status?: number;
};

export class ElbaError extends Error {
  readonly message: string;
  readonly path?: string;
  readonly method?: string;
  readonly response?: Response;
  readonly cause?: unknown;
  readonly status?: number;

  constructor(message: string, { path, method, response, cause, status }: ElbaErrorOptions = {}) {
    super(message);
    this.message = message;
    this.path = path;
    this.method = method;
    this.response = response;
    this.cause = cause;
    this.status = status;
  }
}
