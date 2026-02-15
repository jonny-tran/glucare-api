import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello(): string {
    return 'Kiểm tra API GluCare hoạt động tốt!';
  }
}
