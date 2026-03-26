import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const UserIdParamSchema = z.object({
  id: z.string().uuid(),
});

export class UserIdParamDto extends createZodDto(UserIdParamSchema) {}
