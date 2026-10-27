import {
  S3Client,
  PutObjectCommand,
  DeleteObjectsCommand,
  ListObjectsV2Command,
} from '@aws-sdk/client-s3';

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`${name} is not set`);
  return v;
}

export function isR2Configured(): boolean {
  return Boolean(
    process.env.R2_ACCOUNT_ID &&
      process.env.R2_ACCESS_KEY_ID &&
      process.env.R2_SECRET_ACCESS_KEY &&
      process.env.R2_BUCKET &&
      process.env.R2_PUBLIC_BASE_URL
  );
}

export function getR2Client(): S3Client {
  const accountId = requireEnv('R2_ACCOUNT_ID');
  return new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: requireEnv('R2_ACCESS_KEY_ID'),
      secretAccessKey: requireEnv('R2_SECRET_ACCESS_KEY'),
    },
  });
}

export function r2PublicUrl(key: string): string {
  const base = requireEnv('R2_PUBLIC_BASE_URL').replace(/\/$/, '');
  return `${base}/${key.replace(/^\//, '')}`;
}

export async function uploadToR2(
  key: string,
  body: Buffer | Uint8Array,
  contentType: string
): Promise<string> {
  const client = getR2Client();
  const bucket = requireEnv('R2_BUCKET');
  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
    })
  );
  return r2PublicUrl(key);
}

export async function listR2Prefix(prefix: string): Promise<string[]> {
  const client = getR2Client();
  const bucket = requireEnv('R2_BUCKET');
  const keys: string[] = [];
  let token: string | undefined;
  do {
    const res = await client.send(
      new ListObjectsV2Command({
        Bucket: bucket,
        Prefix: prefix,
        ContinuationToken: token,
      })
    );
    for (const obj of res.Contents ?? []) {
      if (obj.Key) keys.push(obj.Key);
    }
    token = res.IsTruncated ? res.NextContinuationToken : undefined;
  } while (token);
  return keys;
}

export async function deleteR2Keys(keys: string[]): Promise<void> {
  if (!keys.length) return;
  const client = getR2Client();
  const bucket = requireEnv('R2_BUCKET');
  // S3 DeleteObjects max 1000
  for (let i = 0; i < keys.length; i += 1000) {
    const chunk = keys.slice(i, i + 1000);
    await client.send(
      new DeleteObjectsCommand({
        Bucket: bucket,
        Delete: { Objects: chunk.map((Key) => ({ Key })) },
      })
    );
  }
}

/** Prefix helpers matching plan: product-images/ and payment-proofs/ */
export const R2_PREFIX = {
  productImages: 'product-images',
  paymentProofs: 'payment-proofs',
} as const;
