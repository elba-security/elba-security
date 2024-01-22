import { vi } from 'vitest';

const mocks = vi.hoisted(() => {
  return {
    updateUsers: vi.fn(),
    deleteUsers: vi.fn(),
  };
});
vi.resetModules();
vi.mock('@elba-security/sdk', () => {
  const actual = vi.importActual('@elba-security/sdk');
  return {
    ...actual,
    Elba: vi.fn(() => {
      return {
        users: {
          update: mocks.updateUsers,
          delete: mocks.deleteUsers,
        },
      };
    }),
  };
});

export default mocks;
