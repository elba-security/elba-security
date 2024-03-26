import { env } from '@/env';
import { decryptText, encryptText } from '../../../../packages/utils/src';

export const encrypt = (data: string) => {
  return encryptText(data, env.ENCRYPTION_KEY);
};

export const decrypt = (data: string) => {
  return decryptText(data, env.ENCRYPTION_KEY);
};
