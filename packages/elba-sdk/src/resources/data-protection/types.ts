export type DataProtectionObjectPermission = {
  id: string;
  metadata?: unknown;
  type: 'user' | 'domain' | 'anyone';
  email?: string;
  userId?: string;
  domain?: string;
  displayName?: string;
};

export type DataProtectionObject = {
  id: string;
  name: string;
  lastAccessedAt?: Date;
  url: string;
  ownerId: string;
  metadata?: unknown;
  contentHash?: string;
  isSensitive?: boolean;
  permissions: DataProtectionObjectPermission[];
};

export type DataProtectionUpdateObjectsResult = {
  success: boolean;
};

export type DataProtectionDeleteObjectsResult = {
  success: boolean;
};
