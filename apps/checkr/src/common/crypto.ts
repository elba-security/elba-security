import { decryptText, encryptText } from '@elba-security/utils';
import { env } from '@/common/env';

export const encrypt = (text: string) =>
  encryptText({
    data: text,
    key: env.ENCRYPTION_KEY,
  });

export const decrypt = (text: string) =>
  decryptText({
    data: text,
    key: env.ENCRYPTION_KEY,
  });
