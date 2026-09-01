import {
	customType,
	index,
	integer,
	pgTable,
	text,
	timestamp,
	varchar,
} from "drizzle-orm/pg-core";
import { organizationsTable } from "./organizations";
import { usersTable } from "./users";

const bytea = customType<{ data: Buffer; driverData: Buffer }>({
	dataType() {
		return "bytea";
	},
});

export const organizationReportSettingsTable = pgTable(
	"organization_report_settings",
	{
		organizationId: varchar("organization_id", { length: 24 })
			.primaryKey()
			.references(() => organizationsTable.id, { onDelete: "cascade" }),
		displayName: varchar("display_name", { length: 255 }),
		headerText: text("header_text"),
		footerText: text("footer_text"),
		legalText: text("legal_text"),
		primaryColor: varchar("primary_color", { length: 32 }),
		secondaryColor: varchar("secondary_color", { length: 32 }),
		logoFileName: varchar("logo_file_name", { length: 255 }),
		logoContentType: varchar("logo_content_type", { length: 128 }),
		logoSizeBytes: integer("logo_size_bytes"),
		logoBlob: bytea("logo_blob"),
		updatedBy: varchar("updated_by", { length: 24 }).references(
			() => usersTable.id,
			{ onDelete: "set null" },
		),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at")
			.defaultNow()
			.$onUpdate(() => new Date())
			.notNull(),
	},
	(table) => [
		index("IDX_organization_report_settings_updated_by").on(table.updatedBy),
	],
);

export type OrganizationReportSettingsInsert =
	typeof organizationReportSettingsTable.$inferInsert;
export type OrganizationReportSettingsSelect =
	typeof organizationReportSettingsTable.$inferSelect;
