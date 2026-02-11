/**
 * Storage adapter interface for file uploads
 * Allows switching between local storage and cloud storage (Azure Blob)
 */
export interface StorageAdapter {
  /**
   * Upload a file and return its URL/path
   */
  upload(
    buffer: Buffer,
    filename: string,
    folder: string,
    mimeType: string,
  ): Promise<string>;

  /**
   * Delete a file by its URL/path
   */
  delete(fileUrl: string): Promise<void>;

  /**
   * Check if a file exists
   */
  exists(fileUrl: string): Promise<boolean>;
}
