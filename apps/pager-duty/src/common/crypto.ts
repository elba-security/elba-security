import { decryptText, encryptText } from '@elba-security/utils';
import { env } from '@/env';

export const encrypt = (text: string) => encryptText(text, env.ENCRYPTION_KEY);

export const decrypt = (text: string) => decryptText(text, env.ENCRYPTION_KEY);
