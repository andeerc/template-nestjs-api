import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

function emptyStringToUndefined(value: unknown) {
  if (typeof value === 'string' && value.trim() === '') {
    return undefined;
  }

  return value;
}

export const FindAllUsersSchema = z.object({
  id: z.preprocess(
    emptyStringToUndefined,
    z.string().uuid().optional(),
  ),
  email: z.preprocess(
    emptyStringToUndefined,
    z.string().email().optional(),
  ),
  name: z.preprocess(
    emptyStringToUndefined,
    z.string().trim().min(1).max(255).optional(),
  ),
  pageCount: z.coerce.number().int().min(1).default(1),
  recordsPerPage: z.coerce.number().int().min(1).max(100).default(25),
});

export class FindAllUsersDto extends createZodDto(FindAllUsersSchema) {}
