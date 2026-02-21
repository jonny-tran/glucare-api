import { Injectable, Logger } from '@nestjs/common';
import * as admin from 'firebase-admin';
import * as fs from 'fs';
import * as path from 'path';
import { NotificationsRepository } from './notifications.repository';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private readonly repo: NotificationsRepository) {
    if (!admin.apps.length) {
      try {
        const serviceAccountPath = path.resolve(
          process.cwd(),
          'src/config/firebase-config.json',
        );
        const serviceAccount = JSON.parse(
          fs.readFileSync(serviceAccountPath, 'utf8'),
        );
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
        });
        this.logger.log('Firebase Admin initialized locally.');
      } catch (error) {
        this.logger.error('Failed to initialize Firebase Admin SDK', error);
      }
    }
  }

  async saveToken(userId: string, fcmToken: string, deviceType?: string) {
    return this.repo.upsertToken(userId, fcmToken, deviceType);
  }

  async sendPushToUser(
    userId: string,
    title: string,
    body: string,
    data?: { [key: string]: string },
  ) {
    const tokens = await this.repo.getTokensByUser(userId);

    if (!tokens || tokens.length === 0) {
      this.logger.log(`No FCM tokens found for user ${userId}. Skipping push.`);
      return;
    }

    const tokenStrings = tokens.map((t) => t.fcmToken);

    const message: admin.messaging.MulticastMessage = {
      notification: { title, body },
      data,
      tokens: tokenStrings,
    };

    try {
      const response = await admin.messaging().sendEachForMulticast(message);

      if (response.failureCount > 0) {
        const failedTokens: string[] = [];
        response.responses.forEach((resp, idx) => {
          if (!resp.success) {
            const errCode = resp.error?.code;
            if (
              errCode === 'messaging/invalid-registration-token' ||
              errCode === 'messaging/registration-token-not-registered'
            ) {
              failedTokens.push(tokenStrings[idx]);
            }
          }
        });

        if (failedTokens.length > 0) {
          // Remove invalid tokens from DB asynchronously
          failedTokens.forEach((token) => {
            this.repo.removeToken(token).catch((err) => {
              this.logger.error(`Failed to remove token ${token}`, err);
            });
          });
          this.logger.log(`Removed ${failedTokens.length} expired FCM tokens.`);
        }
      }
    } catch (error) {
      this.logger.error('Error sending multicast notification', error);
    }
  }
}
