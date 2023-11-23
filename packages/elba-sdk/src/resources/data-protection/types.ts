import type { UpdateDataProtectionObjects } from 'elba-schema';

export type DataProtectionObject = UpdateDataProtectionObjects['objects'][number];

export type DataProtectionObjectPermission = DataProtectionObject['permissions'][number];

export type DataProtectionUpdateObjectsResult = {
  success: boolean;
};

export type DataProtectionDeleteObjectsResult = {
  success: boolean;
};
