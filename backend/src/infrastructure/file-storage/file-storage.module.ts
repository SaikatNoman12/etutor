import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FILE_STORAGE } from './file-storage.interface';
import { LocalFileStorageService } from './local-file-storage.service';

/**
 * FileStorageModule — provides FILE_STORAGE injection token bound to the
 * adapter selected by STORAGE_DRIVER env (local | s3).
 *
 * To use S3, add @aws-sdk/client-s3 to package.json and create
 * S3FileStorageService following the IFileStorageService interface, then
 * extend the factory below.
 */
@Global()
@Module({
  providers: [
    {
      provide: FILE_STORAGE,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const driver = config.get<string>('STORAGE_DRIVER') || 'local';
        if (driver === 'local') return new LocalFileStorageService();
        // For S3: import { S3FileStorageService } from './s3-file-storage.service';
        //         return new S3FileStorageService(config);
        throw new Error(`Unsupported STORAGE_DRIVER: ${driver}`);
      },
    },
  ],
  exports: [FILE_STORAGE],
})
export class FileStorageModule {}
