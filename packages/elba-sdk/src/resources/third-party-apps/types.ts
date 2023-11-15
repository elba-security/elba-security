export type ThirdPartyAppsObjectUser = {
  id: string;
  createdAt?: Date;
  lastAccessedAt?: Date;
  scopes: string[];
  metadata?: Record<string, unknown>;
};

export type ThirdPartyAppsObject = {
  id: string;
  name: string;
  description?: string;
  logoUrl?: string;
  publisherName?: string;
  url?: string;
  users: ThirdPartyAppsObjectUser[];
};

export type ThirdPartyAppsUpdateObjectsResult = {
  message: string;
  data: {
    processedApps: number;
    processedUsers: number;
  };
};

export type ThirdPartyAppsDeleteObjectsResult = {
  success: boolean;
};
