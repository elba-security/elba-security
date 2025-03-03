import { type MapConnectionErrorFn } from '@elba-security/inngest';
import { NangoConnectionError } from '@elba-security/nango';

export class DropboxError extends Error {
  response: Response;

  constructor(message: string, { response }: { response: Response }) {
    super(message);
    this.name = 'DropboxError';
    this.response = response;
    void this.extractErrorText().then((errorText) => {
      this.cause = errorText;
      this.logError();
    });
  }

  private async extractErrorText(): Promise<string> {
    try {
      const errorText = await this.response.clone().text();
      try {
        const errorJson = JSON.parse(errorText) as unknown;
        return JSON.stringify(errorJson, null, 2);
      } catch {
        return errorText;
      }
    } catch (e) {
      return this.response.statusText;
    }
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

export class DropboxNotAdminError extends DropboxError {}

export const mapElbaConnectionError: MapConnectionErrorFn = (error) => {
  if (error instanceof NangoConnectionError && error.response.status === 404) {
    return 'unauthorized';
  }
  if (error instanceof DropboxError && error.response.status === 401) {
    return 'unauthorized';
  }
  if (error instanceof DropboxNotAdminError) {
    return 'not_admin';
  }

  return null;
};
