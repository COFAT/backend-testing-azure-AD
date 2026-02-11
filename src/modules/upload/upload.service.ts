import {
  Injectable,
  Inject,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { StorageAdapter } from './interfaces';
import sharp from 'sharp';
import { v4 as uuidv4 } from 'uuid';

export interface UploadOptions {
  folder: string;
  maxSizeBytes?: number;
  allowedMimeTypes?: string[];
  compress?: boolean;
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
}

export interface UploadResult {
  url: string;
  originalName: string;
  mimeType: string;
  size: number;
}

const DEFAULT_OPTIONS: Partial<UploadOptions> = {
  maxSizeBytes: 2 * 1024 * 1024, // 2MB
  allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
  compress: true,
  maxWidth: 500,
  maxHeight: 500,
  quality: 80,
};

@Injectable()
export class UploadService {
  private readonly logger = new Logger(UploadService.name);

  constructor(
    @Inject('STORAGE_ADAPTER')
    private readonly storageAdapter: StorageAdapter,
  ) {}

  /**
   * Upload a profile photo with compression
   */
  async uploadProfilePhoto(
    file: Express.Multer.File,
    userId: string,
  ): Promise<UploadResult> {
    return this.uploadImage(file, {
      folder: 'profile-photos',
      maxSizeBytes: 2 * 1024 * 1024, // 2MB
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
      compress: true,
      maxWidth: 500,
      maxHeight: 500,
      quality: 80,
    });
  }

  /**
   * Upload an image with optional compression
   */
  async uploadImage(
    file: Express.Multer.File,
    options: UploadOptions,
  ): Promise<UploadResult> {
    const opts = { ...DEFAULT_OPTIONS, ...options };

    // Validate file
    this.validateFile(file, opts);

    let buffer = file.buffer;
    let mimeType = file.mimetype;

    // Compress and resize if enabled
    if (opts.compress) {
      const result = await this.compressImage(
        buffer,
        opts.maxWidth!,
        opts.maxHeight!,
        opts.quality!,
      );
      buffer = result.buffer;
      mimeType = 'image/webp'; // Always output as WebP for better compression
    }

    // Generate unique filename
    const extension =
      mimeType === 'image/webp' ? 'webp' : this.getExtension(mimeType);
    const filename = `${uuidv4()}.${extension}`;

    // Upload to storage
    const url = await this.storageAdapter.upload(
      buffer,
      filename,
      opts.folder,
      mimeType,
    );

    this.logger.log(
      `Image uploaded: ${file.originalname} -> ${filename} (${buffer.length} bytes)`,
    );

    return {
      url,
      originalName: file.originalname,
      mimeType,
      size: buffer.length,
    };
  }

  /**
   * Delete a file by its URL
   */
  async deleteFile(fileUrl: string): Promise<void> {
    if (!fileUrl) return;
    await this.storageAdapter.delete(fileUrl);
  }

  /**
   * Compress and resize an image
   */
  private async compressImage(
    buffer: Buffer,
    maxWidth: number,
    maxHeight: number,
    quality: number,
  ): Promise<{ buffer: Buffer; info: sharp.OutputInfo }> {
    const image = sharp(buffer);
    const metadata = await image.metadata();

    // Only resize if larger than max dimensions
    let resizeOptions: sharp.ResizeOptions | undefined;
    if (
      (metadata.width && metadata.width > maxWidth) ||
      (metadata.height && metadata.height > maxHeight)
    ) {
      resizeOptions = {
        width: maxWidth,
        height: maxHeight,
        fit: 'inside',
        withoutEnlargement: true,
      };
    }

    const result = await image
      .resize(resizeOptions)
      .webp({ quality })
      .toBuffer({ resolveWithObject: true });

    this.logger.debug(
      `Image compressed: ${metadata.width}x${metadata.height} -> ${result.info.width}x${result.info.height}`,
    );

    return { buffer: result.data, info: result.info };
  }

  /**
   * Validate file against options
   */
  private validateFile(
    file: Express.Multer.File,
    options: UploadOptions,
  ): void {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    // Check file size
    if (options.maxSizeBytes && file.size > options.maxSizeBytes) {
      const maxSizeMB = options.maxSizeBytes / (1024 * 1024);
      throw new BadRequestException(
        `File size exceeds maximum allowed (${maxSizeMB}MB)`,
      );
    }

    // Check mime type
    if (
      options.allowedMimeTypes &&
      !options.allowedMimeTypes.includes(file.mimetype)
    ) {
      throw new BadRequestException(
        `File type not allowed. Allowed types: ${options.allowedMimeTypes.join(', ')}`,
      );
    }
  }

  /**
   * Get file extension from mime type
   */
  private getExtension(mimeType: string): string {
    const extensions: Record<string, string> = {
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/webp': 'webp',
      'image/gif': 'gif',
    };
    return extensions[mimeType] || 'bin';
  }
}
