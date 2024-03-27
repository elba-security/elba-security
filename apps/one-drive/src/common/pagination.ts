import { z } from 'zod';

export type MicrosoftPaginatedResponse<T> = {
  '@odata.nextLink'?: string;
  value: T[];
};

const nextSkipTokenFromNextLinkSchema = z.preprocess((value) => {
  if (typeof value !== 'string') return null;

  const nextLinkUrl = new URL(value);
  return nextLinkUrl.searchParams.get('$skiptoken');
}, z.coerce.string().nullable());

// eslint-disable-next-line @typescript-eslint/unbound-method -- convenience
export const getNextSkipTokenFromNextLink = nextSkipTokenFromNextLinkSchema.parse;
