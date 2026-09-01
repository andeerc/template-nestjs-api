import {
	BadRequestException,
	Inject,
	Injectable,
	NotFoundException,
} from "@nestjs/common";
import { and, eq } from "drizzle-orm";
import { NextFunction, Request, Response } from "express";
import { DRIZZLE } from "../database.tokens";
import type { DrizzleDb } from "../database.types";
import { organizationMembershipsTable } from "../schemas/organization-memberships";
import { organizationsTable } from "../schemas/organizations";
import { TENANT_KEY } from "./tenant.context";

@Injectable()
export class TenantMiddleware {
	constructor(
		@Inject(DRIZZLE)
		private readonly db: DrizzleDb,
	) {}

	async use(req: Request, _res: Response, next: NextFunction): Promise<void> {
		const header = (req.headers["x-tenant-id"] ??
			req.headers["x-organization-id"]) as string | undefined;

		if (!header) {
			next();
			return;
		}

		const organizationId = header.trim();
		if (!organizationId) {
			throw new BadRequestException("Invalid tenant ID");
		}

		const [organization] = await this.db
			.select()
			.from(organizationsTable)
			.where(eq(organizationsTable.id, organizationId))
			.limit(1);

		if (!organization) {
			throw new NotFoundException("Tenant not found");
		}

		const anyReq = req as unknown as Record<string, unknown>;
		const directUser = (anyReq.user as { id?: string } | undefined)?.id;
		const nestedUser = (anyReq.user as { user?: { id?: string } } | undefined)
			?.user?.id;
		const sessionUserId = (anyReq.session as { userId?: string } | undefined)
			?.userId;
		const userId: string | undefined =
			directUser ?? nestedUser ?? sessionUserId;

		if (userId) {
			const [membership] = await this.db
				.select()
				.from(organizationMembershipsTable)
				.where(
					and(
						eq(organizationMembershipsTable.userId, userId),
						eq(organizationMembershipsTable.organizationId, organizationId),
					),
				)
				.limit(1);

			// If user is authenticated but not member, still allow middleware to attach tenant;
			// guards will enforce membership. Keep forbidden only if desired strictness:
			// throw new ForbiddenException('Not a member of this tenant');
			void membership;
		}

		(anyReq as Record<string, unknown>)[TENANT_KEY] = {
			organizationId: organization.id,
			tenantId: organization.id,
			slug: organization.name,
		};

		next();
	}
}
