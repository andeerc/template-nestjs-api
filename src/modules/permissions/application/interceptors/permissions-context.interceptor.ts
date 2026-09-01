import {
	CallHandler,
	ExecutionContext,
	Injectable,
	NestInterceptor,
} from "@nestjs/common";
import { Observable } from "rxjs";
import { PermissionsRequestContextService } from "../services/permissions-request-context.service";

@Injectable()
export class PermissionsContextInterceptor implements NestInterceptor {
	constructor(
		private readonly permissionsRequestContextService: PermissionsRequestContextService,
	) {}

	// eslint-disable-next-line @typescript-eslint/require-await
	async intercept(
		_context: ExecutionContext,
		next: CallHandler,
	): Promise<Observable<any>> {
		return new Observable((subscriber) => {
			this.permissionsRequestContextService.run(() => {
				next.handle().subscribe({
					next: (value) => subscriber.next(value),
					error: (error) => subscriber.error(error),
					complete: () => subscriber.complete(),
				});
			});
		});
	}
}
