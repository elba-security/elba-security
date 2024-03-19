type ApolloErrorOptions = { response?: Response };

export class ApolloError extends Error {
  response?: Response;

  constructor(message: string, { response }: ApolloErrorOptions = {}) {
    super(message);
    this.response = response;
  }
}
