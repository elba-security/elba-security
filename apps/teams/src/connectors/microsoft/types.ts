import type { z } from 'zod';
import type { messageSchema } from '@/connectors/microsoft/schemes';

export type MicrosoftMessage = z.infer<typeof messageSchema>;
