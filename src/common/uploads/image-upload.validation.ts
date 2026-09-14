import {
  BadRequestException,
  Injectable,
  PipeTransform,
  UnsupportedMediaTypeException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { fileTypeFromBuffer } from 'file-type';
import sharp from 'sharp';

const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;
const MAX_IMAGE_WIDTH = 4096;
const MAX_IMAGE_HEIGHT = 4096;
const MAX_IMAGE_PIXELS = 16_000_000;

const ALLOWED_IMAGE_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
]);

const MIME_TYPE_BY_FORMAT: Record<string, string> = {
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  jpg: 'image/jpeg',
  octetstream: 'application/octet-stream',
};

export interface UploadedImageFile {
  buffer: Buffer;
  mimetype: string;
}

type MulterOptions = Parameters<typeof FileInterceptor>[1];

/**
 * Multer's first line of defence. The pipe below must still inspect the bytes,
 * because a multipart Content-Type header is supplied by the client.
 */
export const imageUploadOptions: MulterOptions = {
  limits: {
    fileSize: MAX_IMAGE_SIZE_BYTES,
    files: 1,
    fields: 30,
    parts: 32,
    fieldNameSize: 100,
    fieldSize: 64 * 1024,
  },
  fileFilter: (_request, file, callback) => {
    if (!ALLOWED_IMAGE_MIME_TYPES.has(file.mimetype)) {
      callback(
        new UnsupportedMediaTypeException(
          'Only JPEG, PNG, and WebP image files are allowed',
        ),
        false,
      );
      return;
    }

    callback(null, true);
  },
};

/**
 * Verifies the binary signature and fully decodes the image before it can be
 * passed to Cloudinary. SVG and animated formats are intentionally excluded.
 */
@Injectable()
export class ImageUploadValidationPipe implements PipeTransform {
  async transform(
    file?: UploadedImageFile,
  ): Promise<UploadedImageFile | undefined> {
    if (!file) {
      return undefined;
    }

    const detectedType = await fileTypeFromBuffer(file.buffer);
    if (
      !detectedType ||
      !ALLOWED_IMAGE_MIME_TYPES.has(detectedType.mime) ||
      detectedType.mime !== file.mimetype
    ) {
      throw new UnsupportedMediaTypeException(
        'The uploaded file is not a valid JPEG, PNG, or WebP image',
      );
    }

    try {
      const image = sharp(file.buffer, {
        animated: false,
        failOn: 'error',
        limitInputPixels: MAX_IMAGE_PIXELS,
        pages: 1,
      });
      const metadata = await image.metadata();
      const expectedMimeType = MIME_TYPE_BY_FORMAT[metadata.format ?? ''];

      if (
        !expectedMimeType ||
        expectedMimeType !== detectedType.mime ||
        !metadata.width ||
        !metadata.height ||
        metadata.width > MAX_IMAGE_WIDTH ||
        metadata.height > MAX_IMAGE_HEIGHT
      ) {
        throw new BadRequestException('Image dimensions or format are invalid');
      }

      // Decode all image data, not only the header, so truncated/corrupt files
      // are rejected before they are stored by Cloudinary.
      await image.rotate().toBuffer();
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('The uploaded image is malformed');
    }

    return file;
  }
}
