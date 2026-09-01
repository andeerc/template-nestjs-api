import { MiddlewareConsumer, Module, NestModule } from "@nestjs/common";
import { APP_GUARD, APP_INTERCEPTOR } from "@nestjs/core";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { envConfig } from "@/config/env.config";
import { BetterAuthGuard } from "@/core/auth/better-auth.guard";
import { EmailsModule } from "@/modules/emails/emails.module";
import { OrganizationsModule } from "@/modules/organizations/organizations.module";
import { PermissionsContextInterceptor } from "@/modules/permissions/application/interceptors/permissions-context.interceptor";
import { PermissionsModule } from "@/modules/permissions/permissions.module";
import { ReportsModule } from "@/modules/reports/reports.module";
import { UsersModule } from "@/modules/users/users.module";
import { WsModule } from "@/modules/ws/ws.module";
import { PermissionsGuard } from "@/shared/http/guards/permissions.guard";
import {
	HttpCacheInterceptor,
	SessionStorageInterceptor,
} from "@/shared/http/interceptors";
import { TenantMiddleware } from "@/shared/infrastructure/database/rls/tenant.middleware";
import { SharedInfrastructureModule } from "@/shared/infrastructure/shared-infrastructure.module";

@Module({
	imports: [
		SharedInfrastructureModule,
		ThrottlerModule.forRoot([
			{
				ttl: 60 * 1000,
				limit: 120,
			},
		]),
		EmailsModule,
		OrganizationsModule,
		PermissionsModule,
		ReportsModule,
		UsersModule,
		WsModule,
	],
	controllers: [],
	providers: [
		{
			provide: APP_GUARD,
			useClass: ThrottlerGuard,
		},
		{
			provide: APP_GUARD,
			useClass: BetterAuthGuard,
		},
		{
			provide: APP_GUARD,
			useClass: PermissionsGuard,
		},
		{
			provide: APP_INTERCEPTOR,
			useClass: SessionStorageInterceptor,
		},
		{
			provide: APP_INTERCEPTOR,
			useClass: PermissionsContextInterceptor,
		},
		{
			provide: APP_INTERCEPTOR,
			useClass: HttpCacheInterceptor,
		},
	],
	exports: [],
})
export class AppModule implements NestModule {
	configure(consumer: MiddlewareConsumer) {
		consumer.apply(TenantMiddleware).forRoutes("*");
	}
}
