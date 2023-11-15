export type DataProtectionObjectPermission = {
  id: string;
  metadata?: unknown;
  type: 'user' | 'domain' | 'anyone';
  email?: string;
  user_id?: string;
  domain?: string;
  display_name?: string;
};

export type DataProtectionObject = {
  id: string;
  name: string;
  last_accessed_at?: Date;
  url: string;
  owner_id: string;
  metadata?: unknown;
  content_hash?: string;
  is_sensitive?: boolean;
  permissions: DataProtectionObjectPermission[];
};

export type DataProtectionUpdateObjectsResult = {
  success: boolean;
};

export type DataProtectionDeleteObjectsResult = {
  success: boolean;
};
