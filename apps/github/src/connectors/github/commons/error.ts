import { RequestError } from '@octokit/request-error';

export const getErrorRetryAfter = (error: unknown) => {
  if (
    error instanceof RequestError &&
    error.response?.headers['x-ratelimit-remaining'] === '0' &&
    error.response.headers['x-ratelimit-reset']
  ) {
    return new Date(Number(error.response.headers['x-ratelimit-reset']) * 1000);
  }
};

export const isUnauthorizedError = (error: unknown) => {
  if (!(error instanceof RequestError)) return false;
  // occures when the github elba app have unsufficient permissions
  if (error.response?.status === 401) return true;
  // occures when the github elba app is uninstalled
  if (error.response?.status === 404) {
    return error.request.url.endsWith('/access_tokens');
  }
  return false;
};
