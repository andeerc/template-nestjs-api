import { Inject, Injectable } from "@nestjs/common";
import { eq } from "drizzle-orm";
import type {
	IOrganizationReportSettingsRepository,
	OrganizationReportSettings,
	UpdateOrganizationReportSettingsInput,
	UploadOrganizationReportLogoInput,
} from "@/modules/reports/domain/repositories/organization-report-settings.repository.interface";
import { DatabaseService } from "@/shared/infrastructure/database/database.module";
import { DRIZZLE } from "@/shared/infrastructure/database/database.tokens";
import type { DrizzleDb } from "@/shared/infrastructure/database/database.types";
import { organizationReportSettingsTable } from "@/shared/infrastructure/database/schemas/report-settings";
import { SessionStorageService } from "@/shared/session-storage/session-storage.service";

@Injectable()
export class OrganizationReportSettingsRepository
	implements IOrganizationReportSettingsRepository
{
	constructor(
		@Inject(DRIZZLE) private readonly db: DrizzleDb,
		private readonly databaseService: DatabaseService,
		private readonly sessionStorage: SessionStorageService,
	) {}

	private getRlsContext(organizationId: string): {
		userId?: string;
		organizationId?: string;
		role?: string;
	} {
		const session = this.sessionStorage.getStorageData();
		if (!session?.userId) {
			throw new Error("RLS context missing: unauthenticated request");
		}
		if (!organizationId) {
			throw new Error("RLS context missing: organizationId required");
		}
		return {
			userId: session.userId,
			organizationId: organizationId ?? session.currentOrganizationId,
			role: session.currentOrganizationRole,
		};
	}

	async findByOrganizationId(
		organizationId: string,
	): Promise<OrganizationReportSettings | null> {
		const ctx = this.getRlsContext(organizationId);
		return this.databaseService.withRlsContext(ctx, async (tx) => {
			const [row] = await tx
				.select()
				.from(organizationReportSettingsTable)
				.where(
					eq(organizationReportSettingsTable.organizationId, organizationId),
				)
				.limit(1);
			return row ? this.mapRow(row) : null;
		});
	}

	async upsertSettings(
		organizationId: string,
		updatedBy: string,
		input: UpdateOrganizationReportSettingsInput,
	): Promise<OrganizationReportSettings> {
		const ctx = this.getRlsContext(organizationId);
		return this.databaseService.withRlsContext(ctx, async (tx) => {
			const [current] = await tx
				.select()
				.from(organizationReportSettingsTable)
				.where(
					eq(organizationReportSettingsTable.organizationId, organizationId),
				)
				.limit(1);
			const settingsPayload = this.buildSettingsPayload(input);
			if (!current) {
				await tx
					.insert(organizationReportSettingsTable)
					.values({ organizationId, updatedBy, ...settingsPayload });
			} else {
				await tx
					.update(organizationReportSettingsTable)
					.set({ ...settingsPayload, updatedBy, updatedAt: new Date() })
					.where(
						eq(organizationReportSettingsTable.organizationId, organizationId),
					);
			}
			const [row] = await tx
				.select()
				.from(organizationReportSettingsTable)
				.where(
					eq(organizationReportSettingsTable.organizationId, organizationId),
				)
				.limit(1);
			if (!row)
				throw new Error("Organization report settings not found after upsert");
			return this.mapRow(row);
		});
	}

	async upsertLogo(
		organizationId: string,
		updatedBy: string,
		input: UploadOrganizationReportLogoInput,
	): Promise<OrganizationReportSettings> {
		const ctx = this.getRlsContext(organizationId);
		return this.databaseService.withRlsContext(ctx, async (tx) => {
			const [current] = await tx
				.select()
				.from(organizationReportSettingsTable)
				.where(
					eq(organizationReportSettingsTable.organizationId, organizationId),
				)
				.limit(1);
			const logoPayload = {
				logoFileName: input.fileName,
				logoContentType: input.contentType,
				logoSizeBytes: input.sizeBytes,
				logoBlob: input.blob,
			};
			if (!current) {
				await tx
					.insert(organizationReportSettingsTable)
					.values({ organizationId, updatedBy, ...logoPayload });
			} else {
				await tx
					.update(organizationReportSettingsTable)
					.set({ ...logoPayload, updatedBy, updatedAt: new Date() })
					.where(
						eq(organizationReportSettingsTable.organizationId, organizationId),
					);
			}
			const [row] = await tx
				.select()
				.from(organizationReportSettingsTable)
				.where(
					eq(organizationReportSettingsTable.organizationId, organizationId),
				)
				.limit(1);
			if (!row)
				throw new Error("Organization report settings not found after upsert");
			return this.mapRow(row);
		});
	}

	async deleteLogo(
		organizationId: string,
		updatedBy: string,
	): Promise<OrganizationReportSettings> {
		const ctx = this.getRlsContext(organizationId);
		return this.databaseService.withRlsContext(ctx, async (tx) => {
			const [current] = await tx
				.select()
				.from(organizationReportSettingsTable)
				.where(
					eq(organizationReportSettingsTable.organizationId, organizationId),
				)
				.limit(1);
			const cleared = {
				logoFileName: null,
				logoContentType: null,
				logoSizeBytes: null,
				logoBlob: null,
			} as const;
			if (!current) {
				await tx
					.insert(organizationReportSettingsTable)
					.values({ organizationId, updatedBy, ...cleared });
			} else {
				await tx
					.update(organizationReportSettingsTable)
					.set({ ...cleared, updatedBy, updatedAt: new Date() })
					.where(
						eq(organizationReportSettingsTable.organizationId, organizationId),
					);
			}
			const [row] = await tx
				.select()
				.from(organizationReportSettingsTable)
				.where(
					eq(organizationReportSettingsTable.organizationId, organizationId),
				)
				.limit(1);
			if (!row)
				throw new Error("Organization report settings not found after upsert");
			return this.mapRow(row);
		});
	}

	private buildSettingsPayload(
		input: UpdateOrganizationReportSettingsInput,
	): Partial<typeof organizationReportSettingsTable.$inferInsert> {
		const payload: Partial<
			typeof organizationReportSettingsTable.$inferInsert
		> = {};
		if (input.displayName !== undefined)
			payload.displayName = input.displayName;
		if (input.headerText !== undefined) payload.headerText = input.headerText;
		if (input.footerText !== undefined) payload.footerText = input.footerText;
		if (input.legalText !== undefined) payload.legalText = input.legalText;
		if (input.primaryColor !== undefined)
			payload.primaryColor = input.primaryColor;
		if (input.secondaryColor !== undefined)
			payload.secondaryColor = input.secondaryColor;
		return payload;
	}

	private mapRow(
		row: typeof organizationReportSettingsTable.$inferSelect,
	): OrganizationReportSettings {
		return {
			organizationId: row.organizationId,
			displayName: row.displayName ?? null,
			headerText: row.headerText ?? null,
			footerText: row.footerText ?? null,
			legalText: row.legalText ?? null,
			primaryColor: row.primaryColor ?? null,
			secondaryColor: row.secondaryColor ?? null,
			logoFileName: row.logoFileName ?? null,
			logoContentType: row.logoContentType ?? null,
			logoSizeBytes: row.logoSizeBytes ?? null,
			logoBlob: row.logoBlob ?? null,
			updatedBy: row.updatedBy ?? null,
			createdAt: row.createdAt,
			updatedAt: row.updatedAt,
		};
	}
}
