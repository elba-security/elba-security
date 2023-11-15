export type User = {
  id: string;
  displayName: string;
  additionalEmails?: string[];
  email?: string;
};

export type UserUpdateResult = {
  success: boolean;
};

export type UserDeleteResult = {
  success: boolean;
};
