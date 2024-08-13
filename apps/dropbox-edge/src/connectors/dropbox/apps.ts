import { z } from 'zod';
import { logger } from '@elba-security/logger';
import { env } from '@/common/env';
import { DropboxError } from '../common/error';

export const linkedAppsSchema = z.object({
  team_member_id: z.string().min(1),
  linked_api_apps: z.array(
    z.object({
      app_id: z.string().min(1),
      app_name: z.string().min(1),
      linked: z.string().optional(),
      publisher: z.string().optional(),
      publisher_url: z.string().optional(),
    })
  ),
});

export type LinkedApps = z.infer<typeof linkedAppsSchema>;

const linkedAppsResponseSchema = z.object({
  apps: z.array(linkedAppsSchema),
  has_more: z.boolean(),
  cursor: z.string().optional(),
});

export const getLinkedApps = async ({
  accessToken,
  cursor,
}: {
  accessToken: string;
  cursor: string | null;
}) => {
  const url = new URL(`${env.DROPBOX_API_BASE_URL}/2/team/linked_apps/list_members_linked_apps`);
  const response = await fetch(url.toString(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(cursor ? { cursor } : {}),
  });

  if (!response.ok) {
    const error = await response.text();
    logger.error('Could not retrieve linked apps', { error });
    throw await DropboxError.fromResponse('Could not retrieve linked apps', { response });
  }

  const data: unknown = await response.json();

  const result = linkedAppsResponseSchema.safeParse(data);

  if (!result.success) {
    throw await DropboxError.fromResponse('Could not parse linked apps response', { response });
  }

  const { apps, cursor: nextCursor } = result.data;

  return {
    apps,
    nextCursor: nextCursor ?? null,
  };
};

export const getMemberLinkedApps = async ({
  accessToken,
  teamMemberId,
}: {
  accessToken: string;
  teamMemberId: string;
}) => {
  const url = new URL(`${env.DROPBOX_API_BASE_URL}/2/team/linked_apps/list_member_linked_apps`);

  const response = await fetch(url.toString(), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ team_member_id: teamMemberId }),
  });

  if (!response.ok) {
    throw await DropboxError.fromResponse('Could not retrieve linked apps', { response });
  }

  const data: unknown = await response.json();

  const result = linkedAppsSchema.omit({ team_member_id: true }).safeParse(data);

  if (!result.success) {
    throw await DropboxError.fromResponse('Could not parse linked apps response', { response });
  }

  return {
    apps: result.data.linked_api_apps,
  };
};

export const revokeMemberLinkedApp = async ({
  accessToken,
  appId,
  teamMemberId,
}: {
  accessToken: string;
  appId: string;
  teamMemberId: string;
}) => {
  const url = new URL(`${env.DROPBOX_API_BASE_URL}/2/team/linked_apps/revoke_linked_app`);
  const response = await fetch(url.toString(), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      team_member_id: teamMemberId,
      app_id: appId,
    }),
  });

  if (!response.ok && response.status !== 409) {
    throw await DropboxError.fromResponse('Could not revoke linked apps', { response });
  }
};
