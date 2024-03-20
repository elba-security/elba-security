type GitlabErrorOptions = { response?: Response };

export class GitlabError extends Error {
  response?: Response;

  constructor(message: string, { response }: GitlabErrorOptions = {}) {
    super(message);
    this.response = response;
  }
}
