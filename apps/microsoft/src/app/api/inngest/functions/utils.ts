import { RetryAfterError } from 'inngest';

type MicrosoftGraphErrorResponse = {
  error: {
    code: string;
    message: string;
  };
};

type FetchError = Error & {
  response?: {
    headers: Record<string, string | undefined>;
    data?: {
      error?: MicrosoftGraphErrorResponse;
    };
  };
  code?: string;
};

export const handleError = (error: unknown) => {
  if ((error as FetchError).response) {
    const fetchError = error as FetchError;
    const headers = fetchError.response?.headers;
    const isRateLimitError = fetchError.code === 'requestLimitExceeded';

    if (isRateLimitError && headers?.['x-ratelimit-reset']) {
      const retryAfter = new Date(Number(headers['x-ratelimit-reset']) * 1000);
      throw new RetryAfterError('Microsoft rate limit reached', retryAfter);
    } else if (fetchError.response?.data?.error) {
      const graphError = fetchError.response.data.error;
      throw new Error(
        `Microsoft Graph API Error: ${graphError.error.code} - ${graphError.error.message}`
      );
    }
  }

  throw error;
};
