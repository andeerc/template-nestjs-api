import { BadRequestException, Inject, Injectable } from "@nestjs/common";
import { and, eq, inArray } from "drizzle-orm";
import {
	isPermissionCode,
	isSystemRoleCode,
	type PermissionCode,
	resolveLegacyOrganizationMembershipRole,
	type SystemRoleCode,
} from "@/modules/permissions/application/constants/permissions.constants";
import type {
	IPermissionsRepository,
	OrganizationPermissionSnapshot,
	PermissionCatalog,
	ReplaceOrganizationMemberAccessInput,
} from "@/modules/permissions/domain/repositories/permissions.repository.interface";
import { generateSnowflakeId } from "@/shared/ids/snowflake-id.util";
import { DatabaseService } from "@/shared/infrastructure/database/database.module";
import { DRIZZLE } from "@/shared/infrastructure/database/database.tokens";
import type {
	DrizzleDb,
	DrizzleTransaction,
} from "@/shared/infrastructure/database/database.types";
import { organizationMembershipsTable } from "@/shared/infrastructure/database/schemas/organization-memberships";
import {
	organizationMembershipRolesTable,
	organizationUserPermissionsTable,
	permissionActionsTable,
	permissionFeaturesTable,
	permissionsTable,
	rolePermissionsTable,
	rolesTable,
} from "@/shared/infrastructure/database/schemas/permissions";
import { SessionStorageService } from "@/shared/session-storage/session-storage.service";

@Injectable()
export class PermissionsRepository implements IPermissionsRepository {
	constructor(
		@Inject(DRIZZLE) private readonly db: DrizzleDb,
		private readonly databaseService: DatabaseService,
		private readonly sessionStorage: SessionStorageService,
	) {}

	private getRlsContext(organizationId?: string): {
		userId?: string;
		organizationId?: string;
		role?: string;
	} {
		const session = this.sessionStorage.getStorageData();
		if (!session?.userId) {
			throw new Error("RLS context missing: unauthenticated request");
		}
		const orgId = organizationId ?? session.currentOrganizationId;
		if (!orgId) {
			throw new Error("RLS context missing: organizationId required");
		}
		return {
			userId: session.userId,
			organizationId: orgId,
			role: session.currentOrganizationRole,
		};
	}

	// Catalog is global — privileged read bypasses RLS (no tenant scoping)
	async getCatalog(): Promise<PermissionCatalog> {
		const [features, actions, permissions, roles] = await Promise.all([
			this.db
				.select()
				.from(permissionFeaturesTable)
				.orderBy(permissionFeaturesTable.code),
			this.db
				.select()
				.from(permissionActionsTable)
				.orderBy(permissionActionsTable.code),
			this.db.select().from(permissionsTable).orderBy(permissionsTable.code),
			this.db.select().from(rolesTable).orderBy(rolesTable.code),
		]);
		const featureCodeById = new Map(features.map((f) => [f.id, f.code]));
		const actionCodeById = new Map(actions.map((a) => [a.id, a.code]));
		return {
			features: features.map((f) => ({
				code: f.code,
				name: f.name,
				description: f.description,
			})),
			actions: actions.map((a) => ({
				code: a.code,
				name: a.name,
				description: a.description,
			})),
			permissions: permissions
				.filter((p) => isPermissionCode(p.code))
				.map((p) => ({
					code: p.code as PermissionCode,
					featureCode: featureCodeById.get(p.featureId) ?? "",
					actionCode: actionCodeById.get(p.actionId) ?? "",
					description: p.description,
				}))
				.filter((p) => p.featureCode.length > 0 && p.actionCode.length > 0),
			roles: roles
				.filter((r) => isSystemRoleCode(r.code))
				.map((r) => ({
					code: r.code as SystemRoleCode,
					name: r.name,
					description: r.description,
					isSystem: r.isSystem,
				})),
		};
	}

	async getPermissionSnapshotForUser(
		userId: string,
		organizationId: string,
	): Promise<OrganizationPermissionSnapshot | null> {
		const ctx = this.getRlsContext(organizationId);
		return this.databaseService.withRlsContext(ctx, async (tx) => {
			const membership = await this.findMembership(tx, userId, organizationId);
			if (!membership) return null;
			return this.buildSnapshot(tx, membership, userId, organizationId);
		});
	}

	async replaceOrganizationMemberAccess(
		userId: string,
		organizationId: string,
		input: ReplaceOrganizationMemberAccessInput,
	): Promise<OrganizationPermissionSnapshot | null> {
		const ctx = this.getRlsContext(organizationId);
		const normalizedRoleCodes = Array.from(new Set(input.roleCodes));
		const normalizedOverrides = Array.from(
			new Map(input.overrides.map((o) => [o.permissionCode, o])).values(),
		);

		return this.databaseService.withRlsContext(ctx, async (tx) => {
			const membership = await this.findMembership(tx, userId, organizationId);
			if (!membership) return null;

			const roleRows =
				normalizedRoleCodes.length > 0
					? await tx
							.select()
							.from(rolesTable)
							.where(inArray(rolesTable.code, normalizedRoleCodes))
							.orderBy(rolesTable.code)
					: [];
			const permissionRows =
				normalizedOverrides.length > 0
					? await tx
							.select()
							.from(permissionsTable)
							.where(
								inArray(
									permissionsTable.code,
									normalizedOverrides.map((o) => o.permissionCode),
								),
							)
							.orderBy(permissionsTable.code)
					: [];

			if (roleRows.length !== normalizedRoleCodes.length) {
				const known = new Set(roleRows.map((r) => r.code));
				const invalid = normalizedRoleCodes.filter((c) => !known.has(c));
				throw new BadRequestException(
					`Unknown role codes: ${invalid.join(", ")}`,
				);
			}
			if (permissionRows.length !== normalizedOverrides.length) {
				const known = new Set(permissionRows.map((p) => p.code));
				const invalid = normalizedOverrides
					.map((o) => o.permissionCode)
					.filter((c) => !known.has(c));
				throw new BadRequestException(
					`Unknown permission codes: ${invalid.join(", ")}`,
				);
			}

			await tx
				.delete(organizationMembershipRolesTable)
				.where(
					eq(organizationMembershipRolesTable.membershipId, membership.id),
				);
			if (roleRows.length > 0) {
				await tx.insert(organizationMembershipRolesTable).values(
					roleRows.map((role) => ({
						id: generateSnowflakeId(),
						membershipId: membership.id,
						roleId: role.id,
					})),
				);
			}

			await tx
				.delete(organizationUserPermissionsTable)
				.where(
					and(
						eq(organizationUserPermissionsTable.organizationId, organizationId),
						eq(organizationUserPermissionsTable.userId, userId),
					),
				);

			if (normalizedOverrides.length > 0) {
				const permissionIdByCode = new Map(
					permissionRows.map((p) => [p.code, p.id]),
				);
				await tx.insert(organizationUserPermissionsTable).values(
					normalizedOverrides.map((o) => ({
						id: generateSnowflakeId(),
						organizationId,
						userId,
						permissionId: permissionIdByCode.get(o.permissionCode)!,
						effect: o.effect,
					})),
				);
			}

			const legacyRole =
				resolveLegacyOrganizationMembershipRole(normalizedRoleCodes);
			await tx
				.update(organizationMembershipsTable)
				.set({ role: legacyRole })
				.where(eq(organizationMembershipsTable.id, membership.id));

			return this.buildSnapshot(
				tx,
				{ ...membership, role: legacyRole },
				userId,
				organizationId,
			);
		});
	}

	private async findMembership(
		executor: DrizzleDb | DrizzleTransaction,
		userId: string,
		organizationId: string,
	) {
		const [row] = await executor
			.select()
			.from(organizationMembershipsTable)
			.where(
				and(
					eq(organizationMembershipsTable.userId, userId),
					eq(organizationMembershipsTable.organizationId, organizationId),
				),
			)
			.limit(1);
		return row ?? null;
	}

	private async buildSnapshot(
		executor: DrizzleDb | DrizzleTransaction,
		membership: typeof organizationMembershipsTable.$inferSelect,
		userId: string,
		organizationId: string,
	): Promise<OrganizationPermissionSnapshot> {
		const [membershipRoleRows, overrideRows] = await Promise.all([
			executor
				.select()
				.from(organizationMembershipRolesTable)
				.where(
					eq(organizationMembershipRolesTable.membershipId, membership.id),
				),
			executor
				.select()
				.from(organizationUserPermissionsTable)
				.where(
					and(
						eq(organizationUserPermissionsTable.organizationId, organizationId),
						eq(organizationUserPermissionsTable.userId, userId),
					),
				),
		]);
		const roleIds = Array.from(
			new Set(membershipRoleRows.map((r) => r.roleId)),
		);
		const [roleRows, rolePermissionRows] = await Promise.all([
			roleIds.length > 0
				? executor
						.select()
						.from(rolesTable)
						.where(inArray(rolesTable.id, roleIds))
						.orderBy(rolesTable.code)
				: Promise.resolve([] as (typeof rolesTable.$inferSelect)[]),
			roleIds.length > 0
				? executor
						.select()
						.from(rolePermissionsTable)
						.where(inArray(rolePermissionsTable.roleId, roleIds))
				: Promise.resolve([] as (typeof rolePermissionsTable.$inferSelect)[]),
		]);
		const permissionIds = Array.from(
			new Set([
				...overrideRows.map((o) => o.permissionId),
				...rolePermissionRows.map((r) => r.permissionId),
			]),
		);
		const permissionRows =
			permissionIds.length > 0
				? await executor
						.select()
						.from(permissionsTable)
						.where(inArray(permissionsTable.id, permissionIds))
				: [];
		const permissionCodeById = new Map(
			permissionRows.map((p) => [p.id, p.code]),
		);
		const roleCodes = roleRows
			.map((r) => r.code)
			.filter(isSystemRoleCode)
			.sort() as SystemRoleCode[];
		const overrides = overrideRows
			.map((o) => ({
				permissionCode: permissionCodeById.get(o.permissionId),
				effect: o.effect as "allow" | "deny",
			}))
			.filter(
				(
					o,
				): o is { permissionCode: PermissionCode; effect: "allow" | "deny" } =>
					!!o.permissionCode &&
					isPermissionCode(o.permissionCode) &&
					(o.effect === "allow" || o.effect === "deny"),
			)
			.sort((a, b) => a.permissionCode.localeCompare(b.permissionCode));
		const effectivePermissionCodes = new Set<PermissionCode>(
			rolePermissionRows
				.map((r) => permissionCodeById.get(r.permissionId))
				.filter((c): c is string => !!c)
				.filter(isPermissionCode) as PermissionCode[],
		);
		overrides.forEach((o) => {
			if (o.effect === "allow") effectivePermissionCodes.add(o.permissionCode);
			else effectivePermissionCodes.delete(o.permissionCode);
		});
		return {
			userId,
			organizationId,
			legacyRole: membership.role === "owner" ? "owner" : "member",
			roleCodes,
			overrides,
			effectivePermissionCodes: Array.from(effectivePermissionCodes).sort(),
		};
	}
}
