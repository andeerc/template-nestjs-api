import { Inject, Injectable } from "@nestjs/common";
import { and, desc, eq, inArray } from "drizzle-orm";
import { Organization } from "@/modules/organizations/domain/entities/organization.entity";
import type {
	CreateOrganizationData,
	IOrganizationRepository,
	OrganizationAccess,
	OrganizationMembershipRole,
} from "@/modules/organizations/domain/repositories/organization.repository.interface";
import { DEFAULT_ORGANIZATION_OWNER_ROLE_CODE } from "@/modules/permissions/application/constants/permissions.constants";
import { generateSnowflakeId } from "@/shared/ids/snowflake-id.util";
import { DatabaseService } from "@/shared/infrastructure/database/database.module";
import { DRIZZLE } from "@/shared/infrastructure/database/database.tokens";
import type { DrizzleDb } from "@/shared/infrastructure/database/database.types";
import { organizationMembershipsTable } from "@/shared/infrastructure/database/schemas/organization-memberships";
import { organizationsTable } from "@/shared/infrastructure/database/schemas/organizations";
import {
	organizationMembershipRolesTable,
	rolesTable,
} from "@/shared/infrastructure/database/schemas/permissions";
import { SessionStorageService } from "@/shared/session-storage/session-storage.service";

@Injectable()
export class OrganizationRepository implements IOrganizationRepository {
	constructor(
		@Inject(DRIZZLE)
		private readonly db: DrizzleDb,
		private readonly databaseService: DatabaseService,
		private readonly sessionStorage: SessionStorageService,
	) {}

	private getRlsContext(override?: {
		userId?: string;
		organizationId?: string;
	}): { userId?: string; organizationId?: string; role?: string } {
		const session = this.sessionStorage.getStorageData();
		// Prefer session, fallback to override params for system calls
		const userId = session?.userId ?? override?.userId;
		const organizationId =
			session?.currentOrganizationId ?? override?.organizationId;
		const role = session?.currentOrganizationRole;
		if (!userId) {
			// For createForUser/listForUser we allow param-based userId even without session
			if (override?.userId) {
				return { userId: override.userId, organizationId, role };
			}
			throw new Error("RLS context missing: unauthenticated request");
		}
		return { userId, organizationId, role };
	}

	async createForUser(
		data: CreateOrganizationData,
	): Promise<OrganizationAccess> {
		const role = data.role ?? "owner";
		const ctx = this.getRlsContext({ userId: data.userId });
		return this.databaseService.withRlsContext(ctx, async (tx) => {
			const [organizationRow] = await tx
				.insert(organizationsTable)
				.values({
					id: generateSnowflakeId(),
					name: data.name,
				})
				.returning();
			if (!organizationRow)
				throw new Error("Organization insert did not return a row.");

			const membershipId = generateSnowflakeId();
			const [membershipRow] = await tx
				.insert(organizationMembershipsTable)
				.values({
					id: membershipId,
					organizationId: organizationRow.id,
					userId: data.userId,
					role,
				})
				.returning();
			if (!membershipRow)
				throw new Error("Organization membership insert did not return a row.");

			const [ownerRole] = await tx
				.select()
				.from(rolesTable)
				.where(eq(rolesTable.code, DEFAULT_ORGANIZATION_OWNER_ROLE_CODE))
				.limit(1);
			if (!ownerRole?.id)
				throw new Error(
					'Seeded role "org_owner" was not found. Run database seeds before creating organizations.',
				);

			await tx.insert(organizationMembershipRolesTable).values({
				id: generateMembershipRoleId(membershipRow.id),
				membershipId: membershipRow.id,
				roleId: ownerRole.id,
			});

			return { organization: mapOrganizationRow(organizationRow), role };
		});
	}

	async listForUser(userId: string): Promise<OrganizationAccess[]> {
		const ctx = this.getRlsContext({ userId });
		return this.databaseService.withRlsContext(ctx, async (tx) => {
			const memberships = await tx
				.select()
				.from(organizationMembershipsTable)
				.where(eq(organizationMembershipsTable.userId, userId));
			if (memberships.length === 0) return [];
			const orgIds = Array.from(
				new Set(memberships.map((m) => m.organizationId)),
			);
			const organizations = await tx
				.select()
				.from(organizationsTable)
				.where(inArray(organizationsTable.id, orgIds))
				.orderBy(desc(organizationsTable.createdAt));
			const membershipByOrganizationId = new Map(
				memberships.map((m) => [m.organizationId, m]),
			);
			return organizations
				.map((org) => {
					const m = membershipByOrganizationId.get(org.id);
					if (!m) return null;
					return mapAccessRow(org, m);
				})
				.filter((a): a is OrganizationAccess => a !== null);
		});
	}

	async findAccessibleByIdForUser(
		organizationId: string,
		userId: string,
	): Promise<OrganizationAccess | null> {
		const ctx = this.getRlsContext({ userId, organizationId });
		return this.databaseService.withRlsContext(
			{ ...ctx, organizationId },
			async (tx) => {
				const [membership] = await tx
					.select()
					.from(organizationMembershipsTable)
					.where(
						and(
							eq(organizationMembershipsTable.userId, userId),
							eq(organizationMembershipsTable.organizationId, organizationId),
						),
					)
					.limit(1);
				if (!membership) return null;
				const [organization] = await tx
					.select()
					.from(organizationsTable)
					.where(eq(organizationsTable.id, organizationId))
					.limit(1);
				return organization ? mapAccessRow(organization, membership) : null;
			},
		);
	}
}

function generateMembershipRoleId(membershipId: string): string {
	return membershipId;
}

function mapAccessRow(
	organization: typeof organizationsTable.$inferSelect,
	membership: typeof organizationMembershipsTable.$inferSelect,
): OrganizationAccess {
	return {
		organization: mapOrganizationRow(organization),
		role: membership.role as OrganizationMembershipRole,
	};
}

function mapOrganizationRow(
	row: typeof organizationsTable.$inferSelect,
): Organization {
	return new Organization({
		id: row.id,
		name: row.name,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
	});
}
