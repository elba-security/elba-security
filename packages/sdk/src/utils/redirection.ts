export type RedirectionError = 'unauthorized' | 'internal_error';

export type GetRedirectUrlParams = {
  sourceId: string;
  baseUrl: string | URL;
  error?: RedirectionError;
};

export const getRedirectUrl = ({ sourceId, baseUrl, error }: GetRedirectUrlParams): string => {
  const url = new URL(baseUrl);
  url.searchParams.append('source_id', sourceId);
  if (!error) {
    url.searchParams.append('success', 'true');
  } else {
    url.searchParams.append('error', error);
  }
  return url.toString();
};
