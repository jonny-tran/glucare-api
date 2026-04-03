import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { FilesService } from './services/files.service';

@Injectable()
export class CloudinaryTempCleanupTask {
  private readonly logger = new Logger(CloudinaryTempCleanupTask.name);

  constructor(private readonly filesService: FilesService) {}

  @Cron(CronExpression.EVERY_HOUR)
  async purgeOldTempAssets() {
    try {
      await this.filesService.deleteTempOlderThan24h();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      this.logger.warn(`Cron Cloudinary cleanup failed: ${msg}`);
    }
  }
}
