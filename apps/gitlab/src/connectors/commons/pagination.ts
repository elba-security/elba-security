import { z } from 'zod';

const nextPageFromLinkSchema = z.preprocess((value) => {
  if (typeof value !== 'string') return null;

  const nextPageUrl = /<(?<nextPageUrl>[^>]+)>;\s*rel="next"/.exec(value)?.groups?.nextPageUrl;
  if (!nextPageUrl) return null;

  return new URL(nextPageUrl).searchParams.get('page');
}, z.coerce.number().nullable());

// eslint-disable-next-line @typescript-eslint/unbound-method -- convenience
export const getNextPageFromLink = nextPageFromLinkSchema.parse;