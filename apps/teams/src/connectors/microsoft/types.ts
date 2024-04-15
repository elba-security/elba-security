import type { z } from 'zod';
import type { commonMessageSchema, messageSchema } from '@/connectors/microsoft/schemes';

export type MicrosoftMessage = z.infer<typeof messageSchema>;
export type MicrosoftReply = z.infer<typeof commonMessageSchema>;
