import { type Auth0User } from '../users';

export const users: Auth0User[] = Array.from({ length: 10 }, (_, i) => ({
  user_id: `user-id-${i}`,
  name: `user-name-${i}`,
  email: `user-${i}@gmail.com`,
}));
