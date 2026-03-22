export const FILE_STORAGE_PORT = Symbol('FILE_STORAGE_PORT');

/**
 * Port (interface) for file storage — decouples the application layer
 * from the S3/MinIO infrastructure implementation.
 */
export interface IFileStoragePort {
  uploadProductImage(productId: string, buffer: Buffer, mimeType: string): Promise<string>;
  deleteFile(path: string): Promise<void>;
}
