export const getNextPageUrlFromLink = (headers: Headers): string | null => {
  const links: string[] = [];

  // Iterate through all headers to collect multiple 'Link' values
  headers.forEach((value, key) => {
    if (key.toLowerCase() === 'link') {
      links.push(value);
    }
  });

  // Process each link header to find rel="next"
  for (const link of links) {
    const match = /<(?<nextUrl>[^>]+)>;\s*rel="next"/.exec(link);
    if (match?.groups?.nextUrl) {
      return match.groups.nextUrl;
    }
  }

  return null;
};
