import { z } from 'zod';

const nextOffsetFromLinkSchema = z.preprocess((value) => {
  if (typeof value !== 'string') {
    return null;
  }
  const match = /<(?<nextLink>[^>]+)>; rel="next"/gm.exec(value);

  if (!match?.groups?.nextLink) {
    return null;
  }

  const nextUrl = new URL(match.groups.nextLink);
  return nextUrl.searchParams.get('offset');
}, z.coerce.number().nullable());

export const getNextOffsetFromLink = (link: string | null) => nextOffsetFromLinkSchema.parse(link);
