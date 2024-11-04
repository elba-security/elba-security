import type { UpdateDataProtectionObjects } from '@elba-security/schemas';

export type DataProtectionObject = UpdateDataProtectionObjects['objects'][number];

export type DataProtectionObjectPermission = DataProtectionObject['permissions'][number];

export enum DataProtectionErrorCode {
  TrialOrgIssuesLimitExceeded = 1,
}

export type DataProtectionUpdateObjectsResult = {
  code?: DataProtectionErrorCode;
  success: boolean;
};

export type DataProtectionDeleteObjectsResult = {
  code?: DataProtectionErrorCode;
  success: boolean;
};
