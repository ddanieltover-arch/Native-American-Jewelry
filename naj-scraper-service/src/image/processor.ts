import sharp, { Sharp } from 'sharp';
import axios from 'axios';
import path from 'path';
import fs from 'fs/promises';
import { config } from '../config';
import { logger } from '../utils/logger';
import { uploadImageToStorage, saveProductImage } from '../db/supabase';
import { formatBytes } from '../utils/helpers';
import type { ImageJobData, ImageResult } from '../types';

// ─── Responsive output sizes ──────────────────────────────
const OUTPUT_SIZES = [
  { label: 'thumb',  width: 400  },
  { label: 'medium', width: 800  },
  { label: 'large',  width: 1200 },
] as const;

// ─── Process a single image end-to-end ───────────────────
export async function processImage(job: ImageJobData): Promise<ImageResult | null> {
  const { productId, sourceUrl, position, isPrimary, productName } = job;

  logger.debug('Processing image', { sourceUrl, productId, position });

  try {
    // ── 1. Download ────────────────────────────────────────
    const rawBuffer = await downloadImage(sourceUrl);
    if (!rawBuffer) return null;

    // ── 2. Validate it's actually an image ─────────────────
    const metadata = await sharp(rawBuffer).metadata();
    if (!metadata.width || !metadata.height) {
      logger.warn('Invalid image metadata', { sourceUrl });
      return null;
    }

    // ── 3. Remove competitor branding ─────────────────────
    let processedBuffer = await removeBranding(rawBuffer, metadata);

    // ── 4. Apply our brand watermark ─────────────────────
    processedBuffer = await applyBrandWatermark(processedBuffer);

    // ── 5. Generate responsive sizes + upload ─────────────
    const uploads = await generateAndUpload(processedBuffer, productId, position);
    if (!uploads.large) return null;

    // ── 6. Save image record to DB ────────────────────────
    await saveProductImage({
      product_id: productId,
      url:        uploads.large,
      alt:        productName,
      is_primary: isPrimary,
      position,
    });

    const finalMeta = await sharp(processedBuffer).metadata();
    const sizeBytes = processedBuffer.length;

    logger.info('Image processed', {
      productId,
      position,
      size:        formatBytes(sizeBytes),
      dimensions: `${finalMeta.width}x${finalMeta.height}`,
    });

    return {
      productId,
      position,
      storagePath: `products/${productId}/${position}`,
      publicUrl:   uploads.large,
      width:       finalMeta.width ?? 0,
      height:      finalMeta.height ?? 0,
      sizeBytes,
    };
  } catch (err) {
    logger.error('Image processing failed', { sourceUrl, productId, err });
    return null;
  }
}

// ─── Download image with retry ────────────────────────────
async function downloadImage(url: string, retries = 3): Promise<Buffer | null> {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const response = await axios.get<ArrayBuffer>(url, {
        responseType: 'arraybuffer',
        timeout:      20000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; image-bot/1.0)',
          'Accept':     'image/*,*/*;q=0.8',
          'Referer':    new URL(url).origin,
        },
        maxContentLength: 20 * 1024 * 1024, // 20MB max
      });

      if (response.status !== 200) return null;

      const rawCt = response.headers['content-type'];
      const contentType =
        typeof rawCt === 'string' ? rawCt : Array.isArray(rawCt) ? rawCt[0] ?? '' : '';
      if (!contentType.includes('image')) {
        logger.warn('Non-image content type', { url, contentType });
        return null;
      }

      return Buffer.from(response.data);
    } catch (err) {
      if (attempt < retries - 1) {
        await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)));
      } else {
        logger.warn('Image download failed', { url, err });
      }
    }
  }
  return null;
}

// ─── Remove competitor branding/watermarks ────────────────
async function removeBranding(
  buffer:   Buffer,
  metadata: sharp.Metadata
): Promise<Buffer> {
  const { width = 1200, height = 1200 } = metadata;

  // Strategy: blur the bottom strip where watermarks typically appear
  // For more complex watermarks use AI-based inpainting (e.g. IOPaint)
  // This covers the typical "hippiecowgirlcouture.com" text watermark

  const WATERMARK_ZONE_HEIGHT = Math.round(height * 0.08); // bottom 8%

  try {
    // Create a white rectangle overlay for the watermark zone
    const coverRect = await sharp({
      create: {
        width:      width,
        height:     WATERMARK_ZONE_HEIGHT,
        channels:   3,
        background: { r: 255, g: 255, b: 255 },
      },
    })
      .png()
      .toBuffer();

    const result = await sharp(buffer)
      .resize(width, height, { fit: 'inside', withoutEnlargement: true })
      .composite([
        {
          input:    coverRect,
          top:      height - WATERMARK_ZONE_HEIGHT,
          left:     0,
          blend:    'over',
        },
      ])
      .toBuffer();

    return result;
  } catch {
    // If composite fails, just return the original buffer
    return buffer;
  }
}

// ─── Apply our brand watermark ────────────────────────────
async function applyBrandWatermark(buffer: Buffer): Promise<Buffer> {
  if (!config.BRAND_WATERMARK_PATH) return buffer;

  try {
    const watermarkExists = await fs.access(config.BRAND_WATERMARK_PATH).then(() => true).catch(() => false);
    if (!watermarkExists) return buffer;

    const metadata = await sharp(buffer).metadata();
    const { width = 1200, height = 1200 } = metadata;

    // Scale watermark to ~18% of image width
    const wmarkWidth = Math.round(width * 0.18);

    const watermark = await sharp(config.BRAND_WATERMARK_PATH)
      .resize(wmarkWidth, undefined, { fit: 'inside' })
      .ensureAlpha()
      .toBuffer();

    const wmarkMeta = await sharp(watermark).metadata();
    const wmarkH    = wmarkMeta.height ?? 30;

    return sharp(buffer)
      .composite([{
        input:   watermark,
        gravity: 'southeast',
        top:     height - wmarkH - 12,
        left:    width - wmarkWidth - 12,
        blend:   'over',
      }])
      .toBuffer();
  } catch (err) {
    logger.warn('Watermark application failed, using original', { err });
    return buffer;
  }
}

// ─── Generate all sizes and upload to Supabase Storage ────
async function generateAndUpload(
  buffer:    Buffer,
  productId: string,
  position:  number
): Promise<Record<string, string | null>> {
  const urls: Record<string, string | null> = {
    thumb:  null,
    medium: null,
    large:  null,
  };

  for (const { label, width } of OUTPUT_SIZES) {
    try {
      const resized = await sharp(buffer)
        .resize(width, undefined, {
          fit:                'inside',
          withoutEnlargement: true,
        })
        .webp({ quality: 82, effort: 4 })
        .toBuffer();

      const filePath = `products/${productId}/${position}_${label}.webp`;
      const publicUrl = await uploadImageToStorage(resized, filePath, 'image/webp');

      urls[label] = publicUrl;
    } catch (err) {
      logger.error(`Failed to generate ${label} image`, { productId, position, err });
    }
  }

  return urls;
}

// ─── Health check: verify Sharp is working ────────────────
export async function verifySharp(): Promise<boolean> {
  try {
    const testBuffer = await sharp({
      create: { width: 10, height: 10, channels: 3, background: { r: 255, g: 255, b: 255 } },
    }).webp().toBuffer();
    return testBuffer.length > 0;
  } catch {
    return false;
  }
}
