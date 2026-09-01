import { Organization } from "../entities/organization.entity";

export const ORGANIZATION_MEMBERSHIP_ROLES = ["owner", "member"] as const;

export type OrganizationMembershipRole =
	(typeof ORGANIZATION_MEMBERSHIP_ROLES)[number];

export interface OrganizationAccess {
	organization: Organization;
	role: OrganizationMembershipRole;
}

export interface CreateOrganizationData {
	name: string;
	userId: string;
	role?: OrganizationMembershipRole;
}

export interface IOrganizationRepository {
	createForUser(data: CreateOrganizationData): Promise<OrganizationAccess>;
	listForUser(userId: string): Promise<OrganizationAccess[]>;
	findAccessibleByIdForUser(
		organizationId: string,
		userId: string,
	): Promise<OrganizationAccess | null>;
}

export const ORGANIZATION_REPOSITORY = Symbol("ORGANIZATION_REPOSITORY");
