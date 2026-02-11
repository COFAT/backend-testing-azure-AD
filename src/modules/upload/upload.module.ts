import { Module, Global } from '@nestjs/common';
import { UploadService } from './upload.service';
import { LocalStorageAdapter } from './adapters/local-storage.adapter';

@Global()
@Module({
  providers: [
    UploadService,
    {
      provide: 'STORAGE_ADAPTER',
      useClass: LocalStorageAdapter,
    },
  ],
  exports: [UploadService],
})
export class UploadModule {}
