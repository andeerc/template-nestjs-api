import {
	CanActivate,
	ExecutionContext,
	ForbiddenException,
	Injectable,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { WsException } from "@nestjs/websockets";
import {
	type PermissionCode,
	parsePermissionCode,
} from "@/modules/permissions/application/constants/permissions.constants";
import { PermissionsAbilityFactory } from "@/modules/permissions/application/services/permissions-ability.factory";
import { REQUIRED_PERMISSIONS_KEY } from "../decorators/require-permissions.decorator";

@Injectable()
export class PermissionsGuard implements CanActivate {
	constructor(
		private readonly reflector: Reflector,
		private readonly permissionsAbilityFactory: PermissionsAbilityFactory,
	) {}

	async canActivate(context: ExecutionContext): Promise<boolean> {
		const requiredPermissions = this.reflector.getAllAndOverride<
			PermissionCode[] | undefined
		>(REQUIRED_PERMISSIONS_KEY, [context.getHandler(), context.getClass()]);

		if (!requiredPermissions || requiredPermissions.length === 0) {
			return true;
		}

		const resolvedPermissions =
			await this.permissionsAbilityFactory.buildCurrent();

		const isAllowed = requiredPermissions.every((permissionCode) => {
			const parsedPermission = parsePermissionCode(permissionCode);

			if (!parsedPermission) {
				return false;
			}

			return resolvedPermissions.ability.can(
				parsedPermission.action,
				parsedPermission.feature,
			);
		});

		if (!isAllowed) {
			if (context.getType<"http" | "ws">() === "ws") {
				throw new WsException(
					"Insufficient permissions for the current organization",
				);
			}

			throw new ForbiddenException(
				"Insufficient permissions for the current organization",
			);
		}

		return true;
	}
}
