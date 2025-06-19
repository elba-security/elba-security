import { decryptText, encryptText } from '@elba-security/utils';
import { env } from './env/server';

export const encryptElbaInngestText = (data: string) => {
  return encryptText({
    data,
    key: env.ELBA_INNGEST_ENCRYPTION_KEY,
    iv: env.ELBA_INNGEST_ENCRYPTION_KEY_IV,
  });
};

export const decryptElbaInngestText = (data: string) => {
  return decryptText({
    data,
    key: env.ELBA_INNGEST_ENCRYPTION_KEY,
  });
};
