import { Global, Module } from '@nestjs/common';
import { SessionStorageService } from './session-storage.service';

@Global()
@Module({
  providers: [SessionStorageService],
  exports: [SessionStorageService],
})
export class SessionStorageModule {}
