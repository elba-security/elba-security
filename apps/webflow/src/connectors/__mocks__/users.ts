export const users = Array.from({ length: 10 }, (_, i) => ({
  id: `id-${i}`,
  data: {
    name: `name-${i}`,
    email: `name-${i}@foo.bar`,
  },
}));
