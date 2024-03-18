import type { PgColumn, PgDatabase, PgTableWithColumns, QueryResultHKT } from 'drizzle-orm/pg-core';

export type ElbaDatabaseSchema = {
  organisationsTable: ElbaDatabaseOrganisationsTable;
};

export type ElbaDatabaseOrganisationsTable = PgTableWithColumns<{
  name: 'organisations';
  schema: undefined;
  dialect: 'pg';
  columns: {
    id: PgColumn<{
      name: 'id';
      tableName: 'organisations';
      dataType: 'string';
      columnType: 'PgUUID';
      data: string;
      driverParam: string;
      notNull: true;
      hasDefault: false;
      enumValues: undefined;
      baseColumn: never;
    }>;
    region: PgColumn<{
      name: 'region';
      tableName: 'organisations';
      dataType: 'string';
      columnType: 'PgText';
      data: string;
      driverParam: string;
      notNull: true;
      hasDefault: false;
      enumValues: [string, ...string[]];
      baseColumn: never;
    }>;
  };
}>;

export type ElbaDatabase = PgDatabase<QueryResultHKT, ElbaDatabaseSchema>;
