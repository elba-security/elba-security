import type { PgTableWithColumns } from 'drizzle-orm/pg-core';

const filteredKeys = ['id', 'region', 'createdAt'] as const;

export const filterFields = <T extends Record<string, unknown>>(
  data: Record<string, unknown>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- convenience
  table: PgTableWithColumns<any>
) => {
  const filteredData: Record<string, unknown> = {};
  for (const key in data) {
    if (!(filteredKeys as unknown as string[]).includes(key) && key in table._.columns) {
      filteredData[key] = data[key];
    }
  }
  return filteredData as Partial<Omit<T, (typeof filteredKeys)[number]>>;
};
