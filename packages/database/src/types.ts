export type DatabaseConfig<TSchema> = {
  environment: string;
  url: string;
  proxy: {
    port: number | undefined;
  };
  schema: TSchema;
};
