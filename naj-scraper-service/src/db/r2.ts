import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { config } from '../config';

export function isR2Configured(): boolean {
  return Boolean(
    config.R2_ACCOUNT_ID &&
      config.R2_ACCESS_KEY_ID &&
      config.R2_SECRET_ACCESS_KEY &&
      config.R2_PUBLIC_BASE_URL
  );
}

export function getR2Client(): S3Client {
  if (!isR2Configured()) {
    throw new Error('R2 is not configured');
  }
  return new S3Client({
    region: 'auto',
    endpoint: `https://${config.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: config.R2_ACCESS_KEY_ID!,
      secretAccessKey: config.R2_SECRET_ACCESS_KEY!,
    },
  });
}

export function r2PublicUrl(key: string): string {
  const base = (config.R2_PUBLIC_BASE_URL || '').replace(/\/$/, '');
  return `${base}/${key.replace(/^\//, '')}`;
}

export async function uploadToR2(
  key: string,
  body: Buffer,
  contentType: string
): Promise<string> {
  const client = getR2Client();
  await client.send(
    new PutObjectCommand({
      Bucket: config.R2_BUCKET,
      Key: key,
      Body: body,
      ContentType: contentType,
    })
  );
  return r2PublicUrl(key);
}
