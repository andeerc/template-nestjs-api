import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import {
	getCurrentOrganizationFromSession,
	getSessionFromContext,
} from "@/shared/context/execution-context-session.util";

export const CurrentOrganization = createParamDecorator(
	(data: string | undefined, ctx: ExecutionContext) => {
		const organization = getCurrentOrganizationFromSession(
			getSessionFromContext(ctx),
		);

		return data ? organization?.[data] : organization;
	},
);
