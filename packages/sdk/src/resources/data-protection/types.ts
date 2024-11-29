import type { UpdateDataProtectionObjects } from '@elba-security/schemas';

export type DataProtectionObject = UpdateDataProtectionObjects['objects'][number];

export type DataProtectionObjectPermission = DataProtectionObject['permissions'][number];

export type DataProtectionUpdateObjectsResult = {
  success: boolean;
};

export type DataProtectionDeleteObjectsResult = {
  success: boolean;
};

export type DataProtectionErrorCode = 'trial_org_issues_limit_exceeded' | 'method_not_allowed';

export type DataProtectionUpdateFailure = {
  errors: {
    code: DataProtectionErrorCode;
    message: string;
  }[];
};
