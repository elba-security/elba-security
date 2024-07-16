type JumpcloudErrorOptions = { response?: Response };

export class JumpcloudError extends Error {
  response?: Response;

  constructor(message: string, { response }: JumpcloudErrorOptions = {}) {
    super(message);
    this.response = response;
  }
}
