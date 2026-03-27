import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  CreateBucketCommand,
  HeadBucketCommand,
  PutBucketPolicyCommand,
} from '@aws-sdk/client-s3';

@Injectable()
export class S3Service implements OnModuleInit {
  private readonly logger = new Logger(S3Service.name);
  private client: S3Client;
  private bucket: string;

  constructor(private readonly config: ConfigService) {
    const endpoint = this.config.get<string>('MINIO_ENDPOINT', 'http://localhost:9000');
    const region = this.config.get<string>('MINIO_REGION', 'us-east-1');
    const accessKey = this.config.get<string>('MINIO_ACCESS_KEY', 'minioadmin');
    const secretKey = this.config.get<string>('MINIO_SECRET_KEY', 'minioadmin');
    this.bucket = this.config.get<string>('MINIO_BUCKET', 'auth');

    this.client = new S3Client({
      region,
      endpoint,
      credentials: { accessKeyId: accessKey, secretAccessKey: secretKey },
      forcePathStyle: true,
    });
  }

  async onModuleInit() {
    try {
      await this.client.send(new HeadBucketCommand({ Bucket: this.bucket }));
    } catch {
      await this.client.send(new CreateBucketCommand({ Bucket: this.bucket }));
      this.logger.log(`Created bucket: ${this.bucket}`);
    }

    // Set public read policy so files can be served via gateway proxy
    try {
      const policy = JSON.stringify({
        Version: '2012-10-17',
        Statement: [
          {
            Sid: 'PublicRead',
            Effect: 'Allow',
            Principal: '*',
            Action: ['s3:GetObject'],
            Resource: [`arn:aws:s3:::${this.bucket}/*`],
          },
        ],
      });
      await this.client.send(
        new PutBucketPolicyCommand({ Bucket: this.bucket, Policy: policy }),
      );
      this.logger.log(`Bucket policy set to public-read for: ${this.bucket}`);
    } catch (policyErr: any) {
      this.logger.warn(`Failed to set bucket policy: ${policyErr?.message}`);
    }

    this.logger.log(`S3/MinIO initialized, bucket: ${this.bucket}`);
  }

  /**
   * Upload a file to MinIO and return the public URL (path-style).
   * Key format: profile-pics/{userId}/{uuid}.{ext}
   */
  async uploadProfilePic(
    userId: string,
    buffer: Buffer,
    mimeType: string,
    filename?: string,
  ): Promise<string> {
    const ext = filename?.split('.').pop() || this.mimeToExt(mimeType) || 'jpg';
    const key = `profile-pics/${userId}/${crypto.randomUUID()}.${ext}`;

    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: buffer,
        ContentType: mimeType,
      }),
    );

    const relativePath = `/files/${this.bucket}/${key}`;
    this.logger.debug(`Uploaded profile pic: ${relativePath}`);
    return relativePath;
  }

  async deleteObject(key: string): Promise<void> {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }

  /**
   * Delete a file from MinIO using the stored path (e.g. /files/auth/profile-pics/userId/uuid.jpg).
   * Used to remove the old profile pic when uploading a new one.
   */
  async deleteByStoredPath(storedPath: string | null | undefined): Promise<void> {
    if (!storedPath || typeof storedPath !== 'string') return;
    const prefix = `/files/${this.bucket}/`;
    if (!storedPath.startsWith(prefix)) return;
    const key = storedPath.slice(prefix.length);
    if (!key) return;
    try {
      await this.deleteObject(key);
      this.logger.debug(`Deleted object from MinIO: ${key}`);
    } catch (err: any) {
      this.logger.warn(`Failed to delete MinIO object ${key}: ${err?.message}`);
    }
  }

  private mimeToExt(mime: string): string {
    const map: Record<string, string> = {
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/webp': 'webp',
      'image/gif': 'gif',
    };
    return map[mime?.toLowerCase()] || '';
  }
}
