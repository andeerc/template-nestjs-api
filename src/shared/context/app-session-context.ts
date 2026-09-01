export interface AppSessionContext {
	userId?: string;
	email?: string;
	name?: string;
	currentOrganizationId?: string;
	currentOrganizationName?: string;
	currentOrganizationRole?: string;
	authenticated?: boolean;
}

export interface AppCurrentUser {
	id: string;
	email?: string;
	name?: string;
}

export interface AppCurrentOrganization {
	id: string;
	name?: string;
	role?: string;
}
