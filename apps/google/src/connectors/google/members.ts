import type { infer as zInfer } from 'zod';
import { z } from 'zod';
import { admin_directory_v1 as adminDirectory } from '@googleapis/admin';

export const googleMemberSchema = z.object({
  id: z.string().min(1),
  email: z.string().email(),
  type: z.enum(['USER']),
  status: z.enum(['ACTIVE']),
});

export type GoogleMember = zInfer<typeof googleMemberSchema>;

const googleMemberFields = ['id', 'email', 'type'];

export const listGoogleMembers = async ({
  fields = [...googleMemberFields.map((field) => `members/${field}`), 'nextPageToken'].join(','),
  ...listMembersParams
}: adminDirectory.Params$Resource$Members$List) => {
  const {
    data: { members: googleMembers, nextPageToken },
  } = await new adminDirectory.Admin({}).members.list({
    ...listMembersParams,
    fields,
  });

  const members: GoogleMember[] = [];
  for (const member of googleMembers || []) {
    const result = googleMemberSchema.safeParse(member);
    if (result.success) {
      members.push(result.data);
    }
  }

  return { members, nextPageToken };
};

export const listAllGoogleMembers = async (
  listMembersParams: adminDirectory.Params$Resource$Members$List
) => {
  let pageToken: string | undefined;
  const members: GoogleMember[] = [];
  do {
    const { members: pageMembers, nextPageToken } = await listGoogleMembers({
      ...listMembersParams,
      pageToken,
    });
    members.push(...pageMembers);
    pageToken = nextPageToken ?? undefined;
  } while (pageToken);

  return members;
};
