import bcrypt from "bcrypt";
import { eq } from "drizzle-orm";
import type { DrizzleDb } from "../database.types";
import { organizationMembershipsTable } from "../schemas/organization-memberships";
import { organizationsTable } from "../schemas/organizations";
import { usersTable } from "../schemas/users";

const DEFAULT_ADMIN_EMAIL = "admin@teste.local";
const DEFAULT_ADMIN_NAME = "Administrador";
const DEFAULT_ADMIN_PASSWORD = "admin123456";
const DEFAULT_ADMIN_ID = "710000000000000001";
const DEFAULT_ORGANIZATION_ID = "710000000000000101";
const DEFAULT_ORGANIZATION_MEMBERSHIP_ID = "710000000000000201";

function resolveAdminSeedConfig() {
	return {
		email: process.env.SEED_ADMIN_EMAIL || DEFAULT_ADMIN_EMAIL,
		name: process.env.SEED_ADMIN_NAME || DEFAULT_ADMIN_NAME,
		password: process.env.SEED_ADMIN_PASSWORD || DEFAULT_ADMIN_PASSWORD,
	};
}

function resolveOrganizationSeedConfig() {
	return { name: process.env.SEED_ORGANIZATION_NAME?.trim() || "" };
}

export async function seedBootstrapAdmin(db: DrizzleDb): Promise<void> {
	const admin = resolveAdminSeedConfig();
	const organization = resolveOrganizationSeedConfig();
	const hashedPassword = await bcrypt.hash(admin.password, 12);

	await db
		.insert(usersTable)
		.values({
			id: DEFAULT_ADMIN_ID,
			email: admin.email,
			name: admin.name,
			password: hashedPassword,
		})
		.onConflictDoUpdate({
			target: usersTable.email,
			set: {
				name: admin.name,
				password: hashedPassword,
				updatedAt: new Date(),
			},
		});

	if (!organization.name) return;

	await db
		.insert(organizationsTable)
		.values({
			id: DEFAULT_ORGANIZATION_ID,
			name: organization.name,
		})
		.onConflictDoUpdate({
			target: organizationsTable.id,
			set: { name: organization.name, updatedAt: new Date() },
		});

	await db
		.insert(organizationMembershipsTable)
		.values({
			id: DEFAULT_ORGANIZATION_MEMBERSHIP_ID,
			organizationId: DEFAULT_ORGANIZATION_ID,
			userId: DEFAULT_ADMIN_ID,
			role: "owner",
		})
		.onConflictDoUpdate({
			target: organizationMembershipsTable.id,
			set: {
				organizationId: DEFAULT_ORGANIZATION_ID,
				userId: DEFAULT_ADMIN_ID,
				role: "owner",
			},
		});
}

export async function revertBootstrapAdmin(db: DrizzleDb): Promise<void> {
	const admin = resolveAdminSeedConfig();
	const organization = resolveOrganizationSeedConfig();
	if (organization.name) {
		await db
			.delete(organizationMembershipsTable)
			.where(
				eq(organizationMembershipsTable.id, DEFAULT_ORGANIZATION_MEMBERSHIP_ID),
			);
		await db
			.delete(organizationsTable)
			.where(eq(organizationsTable.id, DEFAULT_ORGANIZATION_ID));
	}
	await db.delete(usersTable).where(eq(usersTable.email, admin.email));
}
