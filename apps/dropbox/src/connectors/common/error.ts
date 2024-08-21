export class DropboxError extends Error {
  response: Response;

  constructor(message: string, response: Response, errorText: string) {
    super(message);
    this.name = 'DropboxError';
    this.response = response;
    this.cause = errorText;

    this.logError(); // Log the error or perform any other necessary action
  }

  static async fromResponse(
    message: string,
    {
      response,
    }: {
      response: Response;
    }
  ): Promise<DropboxError> {
    let errorText: string | null = null;
    try {
      errorText = await response.clone().text();
    } catch (e) {
      errorText = response.statusText;
    }
    return new DropboxError(message, response, errorText);
  }

  logError() {
    const errorDetails = {
      status: this.response.status,
      statusText: this.response.statusText,
      source: this.response.url,
      cause: this.cause,
    };
    // eslint-disable-next-line -- ignore-no-console
    console.error('Dropbox API Error:', JSON.stringify(errorDetails, null, 2));
  }
}
