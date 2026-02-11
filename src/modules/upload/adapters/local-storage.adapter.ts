import { Injectable, Logger } from '@nestjs/common';
import { StorageAdapter } from '../interfaces';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Local filesystem storage adapter for development
 */
@Injectable()
export class LocalStorageAdapter implements StorageAdapter {
  private readonly logger = new Logger(LocalStorageAdapter.name);
  private readonly uploadDir: string;

  constructor() {
    // Use uploads directory at project root
    this.uploadDir = path.join(process.cwd(), 'uploads');
    this.ensureDirectoryExists(this.uploadDir);
  }

  async upload(
    buffer: Buffer,
    filename: string,
    folder: string,
    mimeType: string,
  ): Promise<string> {
    const folderPath = path.join(this.uploadDir, folder);
    this.ensureDirectoryExists(folderPath);

    const filePath = path.join(folderPath, filename);
    await fs.promises.writeFile(filePath, buffer);

    // Return relative URL path
    const relativePath = `/uploads/${folder}/${filename}`;
    this.logger.log(`File uploaded: ${relativePath}`);

    return relativePath;
  }

  async delete(fileUrl: string): Promise<void> {
    // Convert URL to file path
    const relativePath = fileUrl.replace('/uploads/', '');
    const filePath = path.join(this.uploadDir, relativePath);

    try {
      await fs.promises.unlink(filePath);
      this.logger.log(`File deleted: ${fileUrl}`);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw error;
      }
      this.logger.warn(`File not found for deletion: ${fileUrl}`);
    }
  }

  async exists(fileUrl: string): Promise<boolean> {
    const relativePath = fileUrl.replace('/uploads/', '');
    const filePath = path.join(this.uploadDir, relativePath);

    try {
      await fs.promises.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  private ensureDirectoryExists(dir: string): void {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      this.logger.log(`Created directory: ${dir}`);
    }
  }
}
