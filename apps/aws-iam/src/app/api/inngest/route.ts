import { elbaInngestClient } from '@/inngest/client';

/**
 * Inngest webhook handler for processing asynchronous events.
 * This endpoint:
 * 1. Receives events from Inngest
 * 2. Routes them to the appropriate function handlers
 * 3. Returns the function execution results
 *
 * Configuration:
 * - Uses Edge runtime for better performance
 * - Enables streaming for longer running functions
 * - Forces dynamic rendering to ensure fresh data
 */

export const preferredRegion = 'iad1';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const { GET, POST, PUT } = elbaInngestClient.serve();
