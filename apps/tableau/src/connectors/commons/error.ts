type TableauErrorOptions = { response?: Response };

export class TableauError extends Error {
  response?: Response;

  constructor(message: string, { response }: TableauErrorOptions = {}) {
    super(message);
    this.response = response;
  }
}
