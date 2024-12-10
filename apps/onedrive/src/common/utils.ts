export const chunkArray = <T>(entries: T[], size: number): T[][] => {
  const result: T[][] = [];
  for (let i = 0; i < entries.length; i += size) {
    result.push(entries.slice(i, i + size));
  }

  return result;
};
