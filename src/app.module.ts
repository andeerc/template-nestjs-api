import { Module } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { AuthModule } from '@/modules/auth/auth.module';
import { UsersModule } from '@/modules/users/users.module';
import { AuthGuard } from '@/shared/http/guards/auth.guard';
import { HttpCacheInterceptor, SessionStorageInterceptor } from '@/shared/http/interceptors';
import { SharedInfrastructureModule } from '@/shared/infrastructure/shared-infrastructure.module';

@Module({
  imports: [
    SharedInfrastructureModule,
    AuthModule,
    UsersModule,
  ],
  controllers: [],
  providers: [
    {
      provide: APP_GUARD,
      useClass: AuthGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: SessionStorageInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: HttpCacheInterceptor,
    },
  ],
  exports: [],
})
export class AppModule {}
