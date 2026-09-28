import type { z } from "zod";

export async function parseApiResponse<T>(
  response: Response,
  schema: z.ZodType<T>,
): Promise<T> {
  return schema.parse(await response.json());
}