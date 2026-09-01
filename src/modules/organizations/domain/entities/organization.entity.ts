export class Organization {
	id: string;
	name: string;
	createdAt: Date;
	updatedAt: Date;

	constructor(partial: Partial<Organization> = {}) {
		Object.assign(this, partial);
	}
}
