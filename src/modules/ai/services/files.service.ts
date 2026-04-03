import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import streamifier from 'streamifier';
import { cloudinary, configureCloudinary } from '../cloudinary.provider';

export type CloudinaryUploadResult = {
  secureUrl: string;
  publicId: string;
  /** Giá trị từ Cloudinary (vd. video cho một số định dạng âm thanh) — cần khi destroy */
  resourceType: string;
  fileType: 'audio' | 'image';
};

@Injectable()
export class FilesService implements OnModuleInit {
  private readonly logger = new Logger(FilesService.name);

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    configureCloudinary(this.configService);
  }

  /**
   * Upload buffer lên Cloudinary (glucodia/temp/audio hoặc glucodia/temp/images).
   */
  async uploadBuffer(
    buffer: Buffer,
    originalName: string,
    mimeType: string,
  ): Promise<CloudinaryUploadResult> {
    const folder = mimeType.startsWith('audio/')
      ? 'glucodia/temp/audio'
      : 'glucodia/temp/images';
    const fileType: 'audio' | 'image' = mimeType.startsWith('audio/')
      ? 'audio'
      : 'image';

    const publicIdSuffix = randomUUID();

    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder,
          public_id: publicIdSuffix,
          resource_type: 'auto',
          tags: ['glucodia-temp'],
        },
        (err, result) => {
          if (err) {
            return reject(err);
          }
          if (!result?.secure_url || !result.public_id) {
            return reject(new Error('Cloudinary upload: missing secure_url/public_id'));
          }
          resolve({
            secureUrl: result.secure_url,
            publicId: result.public_id,
            resourceType: result.resource_type,
            fileType,
          });
        },
      );
      streamifier.createReadStream(buffer).pipe(uploadStream);
    });
  }

  /**
   * Xóa asset tạm trên Cloudinary cũ hơn 24h (prefix glucodia/temp).
   */
  async deleteTempOlderThan24h(): Promise<void> {
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    let nextCursor: string | undefined;
    let deleted = 0;
    do {
      const res = (await cloudinary.api.resources({
        type: 'upload',
        prefix: 'glucodia/temp',
        max_results: 500,
        ...(nextCursor ? { next_cursor: nextCursor } : {}),
      })) as {
        resources: Array<{
          public_id: string;
          resource_type: string;
          created_at: string;
        }>;
        next_cursor?: string;
      };

      for (const r of res.resources ?? []) {
        const created = new Date(r.created_at).getTime();
        if (Number.isNaN(created) || created >= cutoff) {
          continue;
        }
        try {
          await cloudinary.uploader.destroy(r.public_id, {
            resource_type: r.resource_type as 'image' | 'video' | 'raw',
            invalidate: true,
          });
          deleted += 1;
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          this.logger.warn(
            `Cleanup: không xóa được ${r.public_id} (${r.resource_type}): ${msg}`,
          );
        }
      }
      nextCursor = res.next_cursor;
    } while (nextCursor);

    if (deleted > 0) {
      this.logger.log(`Cloudinary temp cleanup: đã xóa ${deleted} asset cũ hơn 24h`);
    }
  }

  async destroyByPublicId(
    publicId: string,
    resourceType: string,
  ): Promise<void> {
    if (!publicId?.trim()) {
      return;
    }
    try {
      await cloudinary.uploader.destroy(publicId, {
        resource_type: resourceType as 'image' | 'video' | 'raw',
        invalidate: true,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      this.logger.warn(`Cloudinary destroy failed for ${publicId}: ${msg}`);
    }
  }
}
