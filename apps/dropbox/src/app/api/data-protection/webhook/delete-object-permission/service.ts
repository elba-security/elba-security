import { inngest } from '@/common/clients/inngest';

type DeleteObjectPermissions = {
  organisationId: string;
  id: string;
  metadata: any;
};

export const deleteObjectPermissions = async ({
  organisationId,
  //TODO: check if this is the correct id
  // Not sure about the what is the id of (permissionId, permissions, folder)
  id,
  metadata: { type, isPersonal, userId, sourceObjectId },
}: DeleteObjectPermissions) => {
  if (organisationId || !userId) {
    throw new Error('Cannot refresh a Dropbox object without an owner');
  }

  await inngest.send({
    name: 'data-protection/delete-permission',
    data: {
      organisationId,
      sourceObjectId,
      type,
      isPersonal,
      teamMemberId: userId,
    },
  });
};
