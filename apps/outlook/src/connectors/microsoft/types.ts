import { type z } from 'zod';
import { type userSchema } from './schemes';

export type OutlookMessage = {
  id: string;
  subject: string;
  from: string;
  // Encrypted, comma-separated string with recipients listed
  toRecipients: string;
  body: string;
};

export type MicrosoftUser = z.infer<typeof userSchema>;
