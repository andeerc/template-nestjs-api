import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

function emptyStringToUndefined(value: unknown) {
  if (typeof value === 'string' && value.trim() === '') {
    return undefined;
  }

  return value;
}

export const ExportUsersReportSchema = z.object({
  id: z.preprocess(
    emptyStringToUndefined,
    z.uuid().optional(),
  ),
  email: z.preprocess(
    emptyStringToUndefined,
    z.email().optional(),
  ),
  name: z.preprocess(
    emptyStringToUndefined,
    z.string().trim().min(1).max(255).optional(),
  ),
  format: z.enum(['pdf', 'spreadsheet']).default('pdf'),
});

export class ExportUsersReportDto extends createZodDto(ExportUsersReportSchema) {}
