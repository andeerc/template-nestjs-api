import { createZodDto } from "nestjs-zod";
import { z } from "zod";

export const CreateOrganizationSchema = z.object({
	name: z
		.string({
			message: "Name is required",
		})
		.trim()
		.min(1, "Name cannot be empty")
		.max(255, "Name is too long"),
});

export class CreateOrganizationDto extends createZodDto(
	CreateOrganizationSchema,
) {}
