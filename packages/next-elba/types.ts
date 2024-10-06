import { type ElbaConfig } from './config';
import { type ElbaDb } from './database/client';
import { type ElbaSchema } from './database/schema';
import { type ElbaInngest } from './inngest/client';

export type ElbaContext = {
  config: ElbaConfig;
  inngest: ElbaInngest;
  db: ElbaDb;
  schema: ElbaSchema;
};
