import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './database/database.module';
import { AdminModule } from './modules/admin/admin.module';
import { AuthModule } from './modules/auth/auth.module';
import { BlogModule } from './modules/blog/blog.module';
import { ConnectionsModule } from './modules/connections/connections.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { DataSharingModule } from './modules/data-sharing/data-sharing.module';
import { DoctorsModule } from './modules/doctors/doctors.module';
import { GlucoseModule } from './modules/glucose/glucose.module';
import { MealsModule } from './modules/meals/meals.module';
import { MedicationsModule } from './modules/medications/medications.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { SystemConfigModule } from './modules/system-config/system-config.module';
import { UsersModule } from './modules/users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 20,
      },
    ]),
    DatabaseModule,
    AdminModule,
    AuthModule,
    BlogModule,
    DashboardModule,
    GlucoseModule,
    MealsModule,
    MedicationsModule,
    SystemConfigModule,
    UsersModule,
    ConnectionsModule,
    DataSharingModule,
    DoctorsModule,
    NotificationsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: 'APP_GUARD',
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
