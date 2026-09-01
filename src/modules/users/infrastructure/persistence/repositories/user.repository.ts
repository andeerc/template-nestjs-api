import { Inject, Injectable } from "@nestjs/common";
import { and, count, desc, eq, inArray } from "drizzle-orm";
import { User } from "@/modules/users/domain/entities/user.entity";
import {
	CreateUserData,
	FindAllUsersFilters,
	FindAllUsersResult,
	IUserRepository,
	UpdateUserData,
} from "@/modules/users/domain/repositories/user.repository.interface";
import { generateSnowflakeId } from "@/shared/ids/snowflake-id.util";
import { DatabaseService } from "@/shared/infrastructure/database/database.module";
import { DRIZZLE } from "@/shared/infrastructure/database/database.tokens";
import type {
	DrizzleDb,
	DrizzleTransaction,
} from "@/shared/infrastructure/database/database.types";
import { organizationMembershipsTable } from "@/shared/infrastructure/database/schemas/organization-memberships";
import { usersTable } from "@/shared/infrastructure/database/schemas/users";
import { SessionStorageService } from "@/shared/session-storage/session-storage.service";

@Injectable()
export class UserRepository implements IUserRepository {
	constructor(
		@Inject(DRIZZLE)
		private readonly db: DrizzleDb,
		private readonly databaseService: DatabaseService,
		private readonly sessionStorage: SessionStorageService,
	) {}

	private getRlsContextForOrg(organizationId?: string): {
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

	private getOptionalRlsContext():
		| { userId?: string; organizationId?: string; role?: string }
		| undefined {
		const session = this.sessionStorage.getStorageData();
		if (!session?.userId) return undefined;
		return {
			userId: session.userId,
			organizationId: session.currentOrganizationId,
			role: session.currentOrganizationRole,
		};
	}

	// Privileged (system) queries — bypass RLS (auth pre-session flows)
	async findByEmail(email: string): Promise<User | null> {
		const [row] = await this.db
			.select()
			.from(usersTable)
			.where(eq(usersTable.email, email))
			.limit(1);
		return row ? mapUserRow(row) : null;
	}

	async findByGoogleId(googleId: string): Promise<User | null> {
		const [row] = await this.db
			.select()
			.from(usersTable)
			.where(eq(usersTable.googleId, googleId))
			.limit(1);
		return row ? mapUserRow(row) : null;
	}

	async findById(id: string, organizationId?: string): Promise<User | null> {
		if (organizationId) {
			const ctx = this.getRlsContextForOrg(organizationId);
			return this.databaseService.withRlsContext(ctx, async (tx) => {
				const membership = await this.findMembershipForUserInOrganizationTx(
					tx,
					id,
					organizationId,
				);
				if (!membership) return null;
				const [row] = await tx
					.select()
					.from(usersTable)
					.where(eq(usersTable.id, id))
					.limit(1);
				return row ? mapUserRow(row) : null;
			});
		}
		// Non-org-scoped read — try RLS if session present, otherwise privileged fallback (e.g., auth flows)
		const ctx = this.getOptionalRlsContext();
		if (ctx) {
			return this.databaseService.withRlsContext(ctx, async (tx) => {
				const [row] = await tx
					.select()
					.from(usersTable)
					.where(eq(usersTable.id, id))
					.limit(1);
				return row ? mapUserRow(row) : null;
			});
		}
		const [row] = await this.db
			.select()
			.from(usersTable)
			.where(eq(usersTable.id, id))
			.limit(1);
		return row ? mapUserRow(row) : null;
	}

	async findAll(filters: FindAllUsersFilters): Promise<FindAllUsersResult> {
		const shouldPaginate = filters.paginate ?? true;
		const pageCount = filters.pageCount ?? 1;
		const recordsPerPage = filters.recordsPerPage ?? 25;

		// Org-scoped path — must have RLS context, fail closed
		if (filters.organizationId) {
			const ctx = this.getRlsContextForOrg(filters.organizationId);
			return this.databaseService.withRlsContext(ctx, async (tx) => {
				return this.findAllWithExecutor(
					tx,
					filters,
					shouldPaginate,
					pageCount,
					recordsPerPage,
				);
			});
		}

		// Global path — privileged when no session, RLS when session exists
		const ctx = this.getOptionalRlsContext();
		if (ctx) {
			return this.databaseService.withRlsContext(ctx, async (tx) => {
				return this.findAllWithExecutor(
					tx,
					filters,
					shouldPaginate,
					pageCount,
					recordsPerPage,
				);
			});
		}
		return this.findAllWithExecutor(
			this.db,
			filters,
			shouldPaginate,
			pageCount,
			recordsPerPage,
		);
	}

	private async findAllWithExecutor(
		executor: DrizzleDb | DrizzleTransaction,
		filters: FindAllUsersFilters,
		shouldPaginate: boolean,
		pageCount: number,
		recordsPerPage: number,
	): Promise<FindAllUsersResult> {
		const organizationUserIds = filters.organizationId
			? await this.findOrganizationUserIdsTx(executor, filters.organizationId)
			: null;

		if (organizationUserIds && organizationUserIds.length === 0) {
			return { data: [], total: 0 };
		}

		const conditions: ReturnType<typeof eq>[] = [];
		if (organizationUserIds)
			conditions.push(
				inArray(usersTable.id, organizationUserIds) as unknown as ReturnType<
					typeof eq
				>,
			);
		if (filters.id) conditions.push(eq(usersTable.id, filters.id));
		if (filters.email) conditions.push(eq(usersTable.email, filters.email));
		if (filters.name) conditions.push(eq(usersTable.name, filters.name));

		const whereClause = conditions.length ? and(...conditions) : undefined;

		const offset = (pageCount - 1) * recordsPerPage;

		const [countRows, rows] = await Promise.all([
			executor.select({ total: count() }).from(usersTable).where(whereClause),
			shouldPaginate
				? executor
						.select()
						.from(usersTable)
						.where(whereClause)
						.orderBy(desc(usersTable.createdAt))
						.limit(recordsPerPage)
						.offset(offset)
				: executor
						.select()
						.from(usersTable)
						.where(whereClause)
						.orderBy(desc(usersTable.createdAt)),
		]);

		const total = Number(countRows[0]?.total ?? 0);
		return {
			data: (rows as unknown as (typeof usersTable.$inferSelect)[]).map(
				mapUserRow,
			),
			total,
		};
	}

	async create(data: CreateUserData): Promise<User> {
		const ctx = this.getOptionalRlsContext();
		const doInsert = async (executor: DrizzleDb | DrizzleTransaction) => {
			const [row] = await executor
				.insert(usersTable)
				.values({
					id: generateSnowflakeId(),
					email: data.email,
					password: data.password ?? null,
					googleId: data.googleId ?? null,
					avatarUrl: data.avatarUrl ?? null,
					name: data.name,
				})
				.returning();
			if (!row) throw new Error("User insert did not return a row.");
			return mapUserRow(row);
		};
		if (ctx) {
			return this.databaseService.withRlsContext(ctx, (tx) => doInsert(tx));
		}
		return doInsert(this.db);
	}

	async update(id: string, data: UpdateUserData): Promise<User | null> {
		const payload: Partial<typeof usersTable.$inferInsert> = {};
		if (data.email !== undefined) payload.email = data.email;
		if (data.password !== undefined) payload.password = data.password;
		if (data.googleId !== undefined) payload.googleId = data.googleId;
		if (data.avatarUrl !== undefined) payload.avatarUrl = data.avatarUrl;
		if (data.name !== undefined) payload.name = data.name;

		if (Object.keys(payload).length === 0) return this.findById(id);

		(payload as Record<string, unknown>).updatedAt = new Date();

		const ctx = this.getOptionalRlsContext();
		const doUpdate = async (executor: DrizzleDb | DrizzleTransaction) => {
			const [row] = await executor
				.update(usersTable)
				.set(payload)
				.where(eq(usersTable.id, id))
				.returning();
			return row ? mapUserRow(row) : null;
		};
		if (ctx) {
			return this.databaseService.withRlsContext(ctx, (tx) => doUpdate(tx));
		}
		return doUpdate(this.db);
	}

	async delete(id: string): Promise<boolean> {
		const ctx = this.getOptionalRlsContext();
		const doDelete = async (executor: DrizzleDb | DrizzleTransaction) => {
			const result = await executor
				.delete(usersTable)
				.where(eq(usersTable.id, id))
				.returning({ id: usersTable.id });
			return result.length > 0;
		};
		if (ctx) {
			return this.databaseService.withRlsContext(ctx, (tx) => doDelete(tx));
		}
		return doDelete(this.db);
	}

	private async findMembershipForUserInOrganization(
		userId: string,
		organizationId: string,
	) {
		const [row] = await this.db
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

	private async findMembershipForUserInOrganizationTx(
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

	private async findOrganizationUserIds(
		organizationId: string,
	): Promise<string[]> {
		const memberships = await this.db
			.select({ userId: organizationMembershipsTable.userId })
			.from(organizationMembershipsTable)
			.where(eq(organizationMembershipsTable.organizationId, organizationId));
		return Array.from(new Set(memberships.map((m) => m.userId)));
	}

	private async findOrganizationUserIdsTx(
		executor: DrizzleDb | DrizzleTransaction,
		organizationId: string,
	): Promise<string[]> {
		const memberships = await executor
			.select({ userId: organizationMembershipsTable.userId })
			.from(organizationMembershipsTable)
			.where(eq(organizationMembershipsTable.organizationId, organizationId));
		return Array.from(new Set(memberships.map((m) => m.userId)));
	}
}

function mapUserRow(row: typeof usersTable.$inferSelect): User {
	return new User({
		id: row.id,
		email: row.email,
		password: row.password ?? null,
		googleId: row.googleId ?? null,
		avatarUrl: row.avatarUrl ?? null,
		name: row.name,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
	});
}
