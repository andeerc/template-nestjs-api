import { createParamDecorator, ExecutionContext } from "@nestjs/common";

export interface TenantContext {
	organizationId: string;
	tenantId?: string;
	slug?: string;
}

export const TENANT_KEY = "tenant";

export const Tenant = createParamDecorator(
	(_data: unknown, ctx: ExecutionContext): TenantContext | undefined => {
		const request = ctx.switchToHttp().getRequest();
		return request[TENANT_KEY] as TenantContext | undefined;
	},
);

export function getTenantFromRequest(
	request: Record<string, unknown>,
): TenantContext | undefined {
	return request[TENANT_KEY] as TenantContext | undefined;
}
