import { baseRequestSchema } from 'elba-schema';
import { ZodSchema, infer as zInfer } from 'zod';

export type RequestHandler<T extends ZodSchema> = ({
  request,
  data,
}: {
  request: Request;
  data: zInfer<T>;
}) => Promise<Response>;

const defaultRequestHandler = async () => {
  return Response.json({ success: true });
};

const requestHandler = async <T extends ZodSchema>({
  request,
  handler,
  schema,
}: {
  request: Request;
  handler?: RequestHandler<T>;
  schema: T;
}) => {
  const data = await request.json();
  const result = baseRequestSchema.and(schema).safeParse(data);

  if (!result.success) {
    return new Response(result.error.toString(), {
      status: 400,
    });
  }

  if (handler) {
    return handler({ request, data });
  }

  return defaultRequestHandler();
};

export const createRoute = <T extends ZodSchema>({
  path,
  method,
  handler,
  schema,
}: {
  path: string;
  method: 'post' | 'delete';
  handler?: ({ request }: { request: Request; data: zInfer<T> }) => Promise<Response>;
  schema: T;
}) => {
  return {
    path,
    method,
    handler: ({ request }: { request: Request }) => requestHandler({ request, handler, schema }),
  };
};
