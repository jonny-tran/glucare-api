import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateMedicationDto } from './dto/create-medication.dto';
import {
  MedicationFilterDto,
  UpdateMedicationDto,
} from './dto/medication-filter.dto';
import { MedicationsRepository } from './medications.repository';

@Injectable()
export class MedicationsService {
  constructor(private readonly medicationsRepository: MedicationsRepository) {}

  async create(userId: string, data: CreateMedicationDto) {
    return this.medicationsRepository.create(userId, data);
  }

  async findAll(userId: string, query: MedicationFilterDto) {
    return this.medicationsRepository.findAll(userId, query);
  }

  async findOne(id: string, userId: string) {
    const medication = await this.medicationsRepository.findOne(id);
    if (!medication)
      throw new NotFoundException('Không tìm thấy bản ghi thuốc');
    if (medication.userId !== userId)
      throw new BadRequestException('Bạn không có quyền truy cập dữ liệu này');
    return medication;
  }

  async update(id: string, userId: string, data: UpdateMedicationDto) {
    await this.findOne(id, userId);
    return this.medicationsRepository.update(id, userId, data);
  }

  async remove(id: string, userId: string) {
    await this.findOne(id, userId);
    return this.medicationsRepository.softDelete(id, userId);
  }
}
