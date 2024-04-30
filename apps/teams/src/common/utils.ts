import type { DataProtectionObject } from '@elba-security/sdk';

export function chunkObjects(array: DataProtectionObject[], chunkSize: number) {
  const chunks: DataProtectionObject[][] = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }
  return chunks;
}
