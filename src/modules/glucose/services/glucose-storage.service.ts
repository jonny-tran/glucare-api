import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateGlucoseDto } from '../dto/create-glucose.dto';
import { GlucoseFilterDto, UpdateGlucoseDto } from '../dto/glucose-filter.dto';
import { GlucoseRepository } from '../glucose.repository';

@Injectable()
export class GlucoseStorageService {
  constructor(private readonly glucoseRepository: GlucoseRepository) {}

  async create(userId: string, data: CreateGlucoseDto) {
    return this.glucoseRepository.create(userId, data);
  }

  async findAll(userId: string, query: GlucoseFilterDto) {
    return this.glucoseRepository.findAll(userId, query);
  }

  async findOne(id: string, userId: string) {
    const reading = await this.glucoseRepository.findOne(id);
    if (!reading)
      throw new NotFoundException('Không tìm thấy chỉ số đường huyết');
    if (reading.userId !== userId)
      throw new BadRequestException('Bạn không có quyền truy cập dữ liệu này');
    return reading;
  }

  async update(id: string, userId: string, data: UpdateGlucoseDto) {
    await this.findOne(id, userId); // Check existence and ownership
    return this.glucoseRepository.update(id, userId, data);
  }

  async softDelete(id: string, userId: string) {
    await this.findOne(id, userId); // Check existence and ownership
    return this.glucoseRepository.softDelete(id, userId);
  }

  async findLatest(userId: string) {
    return this.glucoseRepository.findLatest(userId);
  }

  async findByDateRange(userId: string, startDate: Date, endDate: Date) {
    return this.glucoseRepository.findByDateRange(userId, startDate, endDate);
  }

  async calculateTodayAverage(userId: string) {
    return this.glucoseRepository.calculateTodayAverage(userId);
  }
}
