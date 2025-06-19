import { type z } from 'zod';
import { type userSchema, type listMessageSchema, type messageSchema } from './schemes';

export type ListOutlookMessage = z.infer<typeof listMessageSchema>;
export type OutlookMessageBySchema = z.infer<typeof messageSchema>;

export type OutlookMessage = {
  id: string;
  subject: string;
  from: string;
  // Encrypted, comma-separated string with recipients listed
  toRecipients: string;
  body: string;
};

export type MicrosoftUser = z.infer<typeof userSchema>;
