import type { UpdateDataProtectionObjects } from '@elba-security/schemas';

export type DataProtectionObject = UpdateDataProtectionObjects['objects'][number];

export type DataProtectionObjectPermission = DataProtectionObject['permissions'][number];

export type DataProtectionUpdateObjectsResult = {
  success: boolean;
};

export type DataProtectionDeleteObjectsResult = {
  success: boolean;
};

export enum DataProtectionErrorCode {
  TrialOrgIssuesLimitExceeded = 1,
  MethodNotAllowed = 2,
}

export type DataProtectionUpdateFailure = {
  errors: {
    code: DataProtectionErrorCode;
    message: string;
  }[];
};
