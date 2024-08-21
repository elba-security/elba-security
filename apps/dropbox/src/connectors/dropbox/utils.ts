export const chunkArray = <T>(array: T[], chunkSize: number): T[][] => {
  if (!Array.isArray(array)) {
    throw new TypeError('The first argument must be an array.');
  }

  if (typeof chunkSize !== 'number' || chunkSize <= 0) {
    throw new RangeError('The chunk size must be a positive number.');
  }

  const chunks: T[][] = [];
  const length = array.length;

  for (let i = 0; i < length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }

  return chunks;
};
