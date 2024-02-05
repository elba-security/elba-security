import { z } from 'zod';

export const slackMessageSchema = z.object({
  ts: z.string().min(1),
  text: z.string().min(1),
  thread_ts: z.string().min(1).optional(),
  user: z.string().min(1),
  edited: z
    .object({
      ts: z.string().min(1),
    })
    .optional(),
});

export type SlackMessage = z.infer<typeof slackMessageSchema>;

export const convertTsToIsoString = (ts: string) => {
  return new Date(parseInt(ts.replace('.', '')) / 1000).toISOString();
};

export const convertTsToDate = (ts: string) => {
  return convertTsToIsoString(ts).split('T')[0];
};

export const getMessageUrl = ({
  teamUrl,
  conversationId,
  messageId,
  threadId,
}: {
  teamUrl: string;
  conversationId: string;
  messageId: string;
  threadId?: string;
}) => {
  const url = new URL(`/archives/${conversationId}/p${messageId.replace('.', '')}`, teamUrl);
  if (threadId) {
    url.searchParams.append('thread_ts', threadId);
    url.searchParams.append('cid', conversationId);
  }

  return url.toString();
};
