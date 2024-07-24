import { env } from '@/env';
import { decryptText, encryptText } from '@elba-security/utils';

export const encrypt = (data: string) => {
  return encryptText({ data, key: env.ENCRYPTION_KEY });
};

export const decrypt = (data: string) => {
  return decryptText({ data, key: env.ENCRYPTION_KEY });
};
