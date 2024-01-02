import { EventSchemas, Inngest } from 'inngest';
import { zodEventSchemas } from './types';

export type FunctionHandler = Parameters<typeof inngest.createFunction>[2];

export const inngest = new Inngest({
  id: 'dropbox',
  schemas: new EventSchemas().fromZod(zodEventSchemas),
});
