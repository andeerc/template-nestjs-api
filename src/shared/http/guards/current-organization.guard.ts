import {
	CanActivate,
	ConflictException,
	ExecutionContext,
	Inject,
	Injectable,
	UnauthorizedException,
} from "@nestjs/common";
import { WsException } from "@nestjs/websockets";
import {
	type IOrganizationRepository,
	ORGANIZATION_REPOSITORY,
} from "@/modules/organizations/domain/repositories/organization.repository.interface";
import {
	getSessionFromContext,
	setSessionOnContext,
} from "@/shared/context/execution-context-session.util";
import { SessionStorageService } from "@/shared/session-storage/session-storage.service";

@Injectable()
export class CurrentOrganizationGuard implements CanActivate {
	constructor(
		@Inject(ORGANIZATION_REPOSITORY)
		private readonly organizationRepository: IOrganizationRepository,
		private readonly sessionStorageService: SessionStorageService,
	) {}

	async canActivate(context: ExecutionContext): Promise<boolean> {
		const session = getSessionFromContext(context);

		if (!session?.authenticated || !session.userId) {
			this.throwUnauthorized(context);
		}

		if (!session.currentOrganizationId) {
			this.throwConflict(context, "Current organization is not selected");
		}

		const access = await this.organizationRepository.findAccessibleByIdForUser(
			session.currentOrganizationId,
			session.userId,
		);

		if (!access) {
			await this.syncCurrentOrganizationSession(context, {
				currentOrganizationId: undefined,
				currentOrganizationName: undefined,
				currentOrganizationRole: undefined,
			});

			this.throwConflict(context, "Current organization is not accessible");
		}

		await this.syncCurrentOrganizationSession(context, {
			currentOrganizationId: access.organization.id,
			currentOrganizationName: access.organization.name,
			currentOrganizationRole: access.role,
		});

		return true;
	}

	private async syncCurrentOrganizationSession(
		context: ExecutionContext,
		data: {
			currentOrganizationId?: string;
			currentOrganizationName?: string;
			currentOrganizationRole?: string;
		},
	): Promise<void> {
		const session = getSessionFromContext(context);

		if (!session) {
			return;
		}

		const hasChanges =
			session.currentOrganizationId !== data.currentOrganizationId ||
			session.currentOrganizationName !== data.currentOrganizationName ||
			session.currentOrganizationRole !== data.currentOrganizationRole;

		if (!hasChanges) {
			return;
		}

		setSessionOnContext(context, {
			...session,
			currentOrganizationId: data.currentOrganizationId,
			currentOrganizationName: data.currentOrganizationName,
			currentOrganizationRole: data.currentOrganizationRole,
		});

		this.sessionStorageService.updateStorageData({
			currentOrganizationId: data.currentOrganizationId,
			currentOrganizationName: data.currentOrganizationName,
			currentOrganizationRole: data.currentOrganizationRole,
		});

		if (context.getType<"http" | "ws">() === "http") {
			const request = context.switchToHttp().getRequest();

			if (typeof request.session?.save === "function") {
				await request.session.save();
			}
		}
	}

	private throwUnauthorized(context: ExecutionContext): never {
		if (context.getType<"http" | "ws">() === "ws") {
			throw new WsException("User not authenticated");
		}

		throw new UnauthorizedException("User not authenticated");
	}

	private throwConflict(context: ExecutionContext, message: string): never {
		if (context.getType<"http" | "ws">() === "ws") {
			throw new WsException(message);
		}

		throw new ConflictException(message);
	}
}
