import type { DataProtectionObject } from '@elba-security/sdk';

export function chunkObjects(array: DataProtectionObject[], chunkSize: number) {
  const chunks: DataProtectionObject[][] = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }
  return chunks;
}

export function mapInvalidMessageData(data: unknown) {
  if (Array.isArray(data)) {
    return data.map((message: object) => ({ ...message, body: '***' }));
  }
  return data;
}
