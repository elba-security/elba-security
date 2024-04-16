import { decryptText, encryptText } from '@elba-security/utils';
import { env } from '@/env';

export const encrypt = (data: string) => {
  return encryptText({ data, key: env.ENCRYPTION_KEY });
};

export const decrypt = (data: string) => {
  return decryptText({ data, key: env.ENCRYPTION_KEY });
};
