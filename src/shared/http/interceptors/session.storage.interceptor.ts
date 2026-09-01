import {
	CallHandler,
	ExecutionContext,
	Injectable,
	NestInterceptor,
} from "@nestjs/common";
import { Observable } from "rxjs";
import { getSessionFromContext } from "@/shared/context/execution-context-session.util";
import { TENANT_KEY } from "@/shared/infrastructure/database/rls/tenant.context";
import { SessionStorageService } from "@/shared/session-storage/session-storage.service";

@Injectable()
export class SessionStorageInterceptor implements NestInterceptor {
	constructor(private readonly sessionStorageService: SessionStorageService) {}

	async intercept(
		context: ExecutionContext,
		next: CallHandler,
	): Promise<Observable<any>> {
		const session = getSessionFromContext(context);
		const request =
			context.getType() === "http"
				? (context.switchToHttp().getRequest() as Record<string, unknown>)
				: null;
		const tenant = request
			? ((request as Record<string, unknown>)[TENANT_KEY] as
					| { organizationId?: string }
					| undefined)
			: undefined;

		const effectiveSession = session
			? {
					...session,
					currentOrganizationId:
						session.currentOrganizationId ?? tenant?.organizationId,
					...(tenant?.organizationId && !session.currentOrganizationId
						? { currentOrganizationId: tenant.organizationId }
						: {}),
				}
			: tenant?.organizationId
				? ({
						currentOrganizationId: tenant.organizationId,
					} as unknown as typeof session)
				: session;

		let finalSession: typeof session | undefined = effectiveSession as
			| typeof session
			| undefined;
		if (!finalSession && request) {
			const anyReq = request as Record<string, unknown>;
			const user = anyReq.user as
				| { id?: string; email?: string; name?: string }
				| undefined;
			if (user?.id) {
				finalSession = {
					userId: user.id,
					email: user.email,
					name: user.name,
					authenticated: true,
					currentOrganizationId: tenant?.organizationId,
				} as unknown as typeof session;
			}
		}

		return new Observable((subscriber) => {
			const run = () => {
				next.handle().subscribe({
					next: (value) => subscriber.next(value),
					error: (err) => subscriber.error(err),
					complete: () => subscriber.complete(),
				});
			};

			if (finalSession) {
				this.sessionStorageService.storage.run(
					finalSession as NonNullable<typeof finalSession>,
					run,
				);
				return;
			}
			run();
		});
	}
}
