import type { NextRequest } from 'next/server';
import { type ElbaContext } from '../types';

export type ElbaRoute = (
  req: NextRequest,
  context: ElbaContext
) => Promise<Response> | Response | Promise<void>;
