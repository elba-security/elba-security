type JiraErrorOptions = { response?: Response };

export class JiraError extends Error {
  response?: Response;

  constructor(message: string, { response }: JiraErrorOptions = {}) {
    super(message);
    this.response = response;
  }
}
