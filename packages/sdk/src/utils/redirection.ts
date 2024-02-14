export type RedirectionError = 'unauthorized' | 'internal_error';

export type GetRedirectUrlParams = {
  sourceId: string;
  baseUrl: string;
  error?: RedirectionError | null;
  region: string;
};

export const getRedirectUrl = ({
  sourceId,
  baseUrl,
  region,
  error,
}: GetRedirectUrlParams): string => {
  const url = new URL(baseUrl.replace('{REGION}', region));
  url.searchParams.append('source_id', sourceId);
  if (!error) {
    url.searchParams.append('success', 'true');
  } else {
    url.searchParams.append('error', error);
  }
  return url.toString();
};
