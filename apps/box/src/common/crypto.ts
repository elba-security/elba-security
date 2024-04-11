import { env } from '@/env';
import { decryptText, encryptText } from '@elba-security/utils';

export const encrypt = (text: string) => encryptText(text, env.ENCRYPTION_KEY);

export const decrypt = (text: string) => decryptText(text, env.ENCRYPTION_KEY);
