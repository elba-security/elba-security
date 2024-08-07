export class DBXResponseError<T> {
  status: number;
  headers: unknown;
  error: T;
  constructor(status: number, headers: unknown, error: T) {
    this.status = status;
    this.headers = headers;
    this.error = error;
  }
}
