import { Injectable } from '@nestjs/common';
import * as fs from 'fs/promises';
import * as path from 'path';
import { FileStorageUploadResult, IFileStorageService } from './file-storage.interface';

/**
 * LocalFileStorageService — writes uploaded files under STORAGE_LOCAL_DIR
 * (default `./uploads`). Suitable for dev + tests. Production should use
 * S3FileStorageService.
 */
@Injectable()
export class LocalFileStorageService implements IFileStorageService {
  private readonly rootDir: string;
  private readonly publicBaseUrl: string;

  constructor() {
    this.rootDir = process.env.STORAGE_LOCAL_DIR || './uploads';
    this.publicBaseUrl = process.env.STORAGE_LOCAL_PUBLIC_URL || '/static/uploads';
  }

  async upload(opts: { bucket?: string; key: string; body: Buffer; mimeType: string }): Promise<FileStorageUploadResult> {
    const bucket = opts.bucket || 'default';
    const fullPath = path.join(this.rootDir, bucket, opts.key);
    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.writeFile(fullPath, opts.body);
    return {
      storageKey: path.join(bucket, opts.key),
      url: `${this.publicBaseUrl}/${bucket}/${opts.key}`,
      size: opts.body.length,
      mimeType: opts.mimeType,
    };
  }

  async delete(opts: { bucket?: string; key: string }): Promise<void> {
    const bucket = opts.bucket || 'default';
    const fullPath = path.join(this.rootDir, bucket, opts.key);
    try { await fs.unlink(fullPath); } catch (_) { /* swallow — idempotent */ }
  }

  async getDownloadUrl(opts: { bucket?: string; key: string }): Promise<string> {
    const bucket = opts.bucket || 'default';
    return `${this.publicBaseUrl}/${bucket}/${opts.key}`;
  }
}
