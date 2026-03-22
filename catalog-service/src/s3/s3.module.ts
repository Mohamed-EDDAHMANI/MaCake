import { Global, Module } from '@nestjs/common';
import { S3Service } from './s3.service';
import { FILE_STORAGE_PORT } from '../application/ports/file-storage.port';

@Global()
@Module({
  providers: [
    S3Service,
    { provide: FILE_STORAGE_PORT, useExisting: S3Service },
  ],
  exports: [S3Service, FILE_STORAGE_PORT],
})
export class S3Module {}
