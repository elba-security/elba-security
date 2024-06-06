import { decryptText, encryptText } from '@elba-security/utils';

export type EncryptedKeys<T> = (keyof {
  [K in keyof T as T[K] extends string ? K : never]: K;
})[];

type EncryptRecordParams<T> = {
  data: T;
  encryptedKeys: EncryptedKeys<T>;
  encryptionKey: string;
};

export const encryptRecord = async <T extends NonNullable<unknown>>({
  data,
  encryptedKeys,
  encryptionKey,
}: EncryptRecordParams<T>): Promise<T> => {
  if (typeof data !== 'object') {
    throw new Error('Cannot encrypt a non-record value');
  }

  const encryptedData = { ...data };

  for (const key of encryptedKeys) {
    const rawValue = data[key as keyof T];
    if (typeof rawValue === 'string') {
      // eslint-disable-next-line no-await-in-loop -- convenience
      const value = await encryptText({ data: rawValue, key: encryptionKey });
      encryptedData[key] = value as T[typeof key];
    }
  }

  return encryptedData;
};

type DecryptRecordParams<T> = {
  data: T;
  encryptedKeys: EncryptedKeys<T>;
  encryptionKey: string;
};

export const decryptRecord = async <T extends NonNullable<unknown>>({
  data,
  encryptedKeys,
  encryptionKey,
}: DecryptRecordParams<T>): Promise<T> => {
  if (typeof data !== 'object') {
    throw new Error('Cannot decrypt a non-record value');
  }

  const decryptedData = { ...data };

  for (const key of encryptedKeys) {
    const rawValue = data[key as keyof T];
    if (typeof rawValue === 'string') {
      // eslint-disable-next-line no-await-in-loop -- convenience
      const value = await decryptText({ data: rawValue, key: encryptionKey });
      decryptedData[key] = value as T[typeof key];
    }
  }

  return decryptedData;
};
