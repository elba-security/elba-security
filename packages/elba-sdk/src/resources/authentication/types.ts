export type AuthenticationObject = {
  userId: string;
  authMethod: 'mfa' | 'password' | 'sso';
};

export type AuthenticationUpdateObjectsResult = {
  success: boolean;
};
