import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { PresignUploadVisibility } from './dto/presign-upload.dto';

export type PresignPutResult = {
  method: 'PUT';
  url: string;
  headers: Record<string, string>;
  storageUrl: string;
  bucket: string;
  objectKey: string;
};

function sanitizeFileName(name: string): string {
  const trimmed = name.trim().replace(/[^\w.\-]+/g, '_');
  return trimmed.length > 0 ? trimmed.slice(0, 180) : 'file';
}

function encodeKeySegments(key: string): string {
  return key.split('/').map(encodeURIComponent).join('/');
}

/** Stored in `contents.storageUrl` for private objects; parsed for signed reads. */
export function buildPrivateLocatorUrl(
  publicApiBase: string,
  bucket: string,
  objectKey: string,
): string {
  const base = publicApiBase.replace(/\/$/, '');
  return `${base}/storage/v1/object/private/${encodeURIComponent(bucket)}/${encodeKeySegments(objectKey)}`;
}

export function tryParsePrivateLocator(
  storageUrl: string,
): { bucket: string; objectKey: string } | null {
  try {
    const u = new URL(storageUrl);
    const marker = '/storage/v1/object/private/';
    const idx = u.pathname.indexOf(marker);
    if (idx === -1) {
      return null;
    }
    const rest = u.pathname.slice(idx + marker.length);
    const parts = rest.split('/').filter(Boolean);
    if (parts.length < 2) {
      return null;
    }
    const bucket = decodeURIComponent(parts[0]);
    const objectKey = parts.slice(1).map(decodeURIComponent).join('/');
    return { bucket, objectKey };
  } catch {
    return null;
  }
}

@Injectable()
export class StorageService {
  constructor(private readonly config: ConfigService) {}

  isConfigured(): boolean {
    return Boolean(
      this.config.get<string>('SUPABASE_S3_ENDPOINT')?.trim() &&
        this.config.get<string>('SUPABASE_S3_REGION')?.trim() &&
        this.config.get<string>('SUPABASE_S3_ACCESS_KEY_ID')?.trim() &&
        this.config.get<string>('SUPABASE_S3_SECRET_ACCESS_KEY')?.trim() &&
        this.config.get<string>('SUPABASE_PUBLIC_URL')?.trim() &&
        this.config.get<string>('SUPABASE_STORAGE_PUBLIC_BUCKET')?.trim() &&
        this.config.get<string>('SUPABASE_STORAGE_PRIVATE_BUCKET')?.trim(),
    );
  }

  private requireS3(): S3Client {
    if (!this.isConfigured()) {
      throw new ServiceUnavailableException(
        'Supabase S3 storage is not configured on the server (see SUPABASE_S3_* and SUPABASE_PUBLIC_URL).',
      );
    }
    const endpoint = this.config.get<string>('SUPABASE_S3_ENDPOINT')!.trim();
    const region = this.config.get<string>('SUPABASE_S3_REGION')!.trim();
    return new S3Client({
      region,
      endpoint,
      credentials: {
        accessKeyId: this.config.get<string>('SUPABASE_S3_ACCESS_KEY_ID')!.trim(),
        secretAccessKey: this.config
          .get<string>('SUPABASE_S3_SECRET_ACCESS_KEY')!
          .trim(),
      },
      forcePathStyle: true,
    });
  }

  private bucketFor(visibility: PresignUploadVisibility): string {
    if (visibility === PresignUploadVisibility.PUBLIC) {
      return this.config.get<string>('SUPABASE_STORAGE_PUBLIC_BUCKET')!.trim();
    }
    return this.config.get<string>('SUPABASE_STORAGE_PRIVATE_BUCKET')!.trim();
  }

  private buildStorageUrl(
    visibility: PresignUploadVisibility,
    bucket: string,
    objectKey: string,
  ): string {
    const base = this.config.get<string>('SUPABASE_PUBLIC_URL')!.replace(/\/$/, '');
    if (visibility === PresignUploadVisibility.PUBLIC) {
      const publicBase = this.config
        .get<string>('SUPABASE_STORAGE_PUBLIC_BASE_URL')
        ?.trim()
        .replace(/\/$/, '');
      if (publicBase) {
        return `${publicBase}/${encodeKeySegments(objectKey)}`;
      }
      return `${base}/storage/v1/object/public/${encodeURIComponent(bucket)}/${encodeKeySegments(objectKey)}`;
    }
    return buildPrivateLocatorUrl(base, bucket, objectKey);
  }

  async presignPut(dto: {
    visibility: PresignUploadVisibility;
    fileName: string;
    contentType: string;
  }): Promise<PresignPutResult> {
    const client = this.requireS3();
    const bucket = this.bucketFor(dto.visibility);
    const safeName = sanitizeFileName(dto.fileName);
    const objectKey = `uploads/${randomUUID()}-${safeName}`;

    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: objectKey,
      ContentType: dto.contentType,
    });

    const url = await getSignedUrl(client, command, { expiresIn: 600 });
    const storageUrl = this.buildStorageUrl(dto.visibility, bucket, objectKey);

    return {
      method: 'PUT',
      url,
      headers: { 'Content-Type': dto.contentType },
      storageUrl,
      bucket,
      objectKey,
    };
  }

  /**
   * For API responses: public URLs pass through; private locator URLs become short-lived signed GET URLs.
   */
  async toReadableUrl(
    storageUrl: string | null | undefined,
  ): Promise<string | null> {
    if (storageUrl == null) {
      return null;
    }
    const trimmed = storageUrl.trim();
    if (!trimmed) {
      return null;
    }
    const parsed = tryParsePrivateLocator(trimmed);
    if (!parsed) {
      return trimmed;
    }
    if (!this.isConfigured()) {
      return trimmed;
    }
    try {
      const client = this.requireS3();
      const command = new GetObjectCommand({
        Bucket: parsed.bucket,
        Key: parsed.objectKey,
      });
      return await getSignedUrl(client, command, { expiresIn: 3600 });
    } catch {
      return trimmed;
    }
  }
}
