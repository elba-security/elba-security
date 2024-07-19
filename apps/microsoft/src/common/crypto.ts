import { decryptText, encryptText } from '@elba-security/utils';
import { logger } from '@elba-security/logger';
import { env } from '@/env';

export const encrypt = (data: string) => {
  return encryptText({ data, key: env.ENCRYPTION_KEY });
};

export const decrypt = (data: string) => {
  try {
    return decryptText({ data, key: env.ENCRYPTION_KEY });
  } catch (error) {
    logger.warn('Could not decrypt data', { data });
    throw error;
  }
};
