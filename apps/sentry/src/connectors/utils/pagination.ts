export const getNextCursorFromHeader = (linkHeader: string) => {
  let nextCursor: string | null = null;
  const links = linkHeader.split(', ');
  const nextLink = links.find((link) => link.includes('rel="next"'));
  const results = links.find((link) => link.includes('results="true"'));
  if (nextLink && results) {
    const match = /<(?<url>[^>]+)>/.exec(nextLink);
    if (match?.groups?.url) {
      const parsedUrl = new URL(match.groups.url);
      nextCursor = parsedUrl.searchParams.get('cursor');
    }
  }
  return nextCursor;
};
