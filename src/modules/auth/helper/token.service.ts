import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { eq } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DATABASE_CONNECTION } from 'src/database/database.module';
import * as schema from 'src/database/schema';

@Injectable()
export class TokenService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: NodePgDatabase<typeof schema>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async generateAuthResponse(userId: string, role: string) {
    const payload = { sub: userId, role };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('JWT_ACCESS_SECRET'),
        expiresIn: '15m',
      }),
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
        expiresIn: '7d',
      }),
    ]);
    await this.updateRefreshToken(userId, refreshToken);

    return {
      accessToken,
      refreshToken,
      userId,
      role,
    };
  }

  async verifyRefreshToken(
    token: string,
  ): Promise<{ sub: string; role: string }> {
    try {
      const payload = await this.jwtService.verifyAsync<{
        sub: string;
        role: string;
      }>(token, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      });
      return payload;
    } catch {
      throw new UnauthorizedException(
        'Refresh Token không hợp lệ hoặc đã hết hạn',
      );
    }
  }

  async updateRefreshToken(userId: string, refreshToken: string) {
    const hash = await argon2.hash(refreshToken);
    await this.db
      .update(schema.users)
      .set({ hashedRefreshToken: hash })
      .where(eq(schema.users.id, userId));
  }
}
