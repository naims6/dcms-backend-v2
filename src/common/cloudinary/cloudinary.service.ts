import { Injectable, BadRequestException } from '@nestjs/common';
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';

@Injectable()
export class CloudinaryService {
  constructor() {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });
  }

  /**
   * Uploads an image buffer directly to Cloudinary.
   */
  async uploadImage(
    fileBuffer: Buffer,
    folder = 'dcms/avatars',
  ): Promise<{ url: string; key: string }> {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: 'image',
        },
        (error, result: UploadApiResponse | undefined) => {
          if (error || !result) {
            return reject(
              new BadRequestException(
                `Cloudinary upload failed: ${error?.message || 'Unknown error'}`,
              ),
            );
          }
          resolve({
            url: result.secure_url,
            key: result.public_id,
          });
        },
      );
      uploadStream.end(fileBuffer);
    });
  }

  /**
   * Deletes an image from Cloudinary using its imageKey (public_id).
   */
  async deleteImage(imageKey: string): Promise<void> {
    if (!imageKey) return;
    try {
      await cloudinary.uploader.destroy(imageKey);
    } catch {
      // Ignore deletion failures gracefully
    }
  }
}
