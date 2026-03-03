import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateExerciseDto } from './dto/create-exercise.dto';
import { ExerciseFilterDto } from './dto/exercise-filter.dto';
import { UpdateExerciseDto } from './dto/update-exercise.dto';
import { ExercisesRepository } from './exercises.repository';

@Injectable()
export class ExercisesService {
  constructor(private readonly exercisesRepo: ExercisesRepository) {}

  /**
   * Tạo bản ghi vận động mới cho Patient.
   * Nếu caloriesBurned không được cung cấp, tính toán sơ bộ dựa trên duration & intensity.
   */
  async create(userId: string, dto: CreateExerciseDto) {
    // Calorie estimation placeholder: nếu không cung cấp thì ước lượng
    if (dto.caloriesBurned === undefined || dto.caloriesBurned === null) {
      dto.caloriesBurned = this.estimateCalories(dto.duration, dto.intensity);
    }

    return this.exercisesRepo.create(userId, dto);
  }

  /**
   * Lấy danh sách vận động của chính Patient (phân trang & lọc).
   */
  async findAll(userId: string, query: ExerciseFilterDto) {
    return this.exercisesRepo.findAll(userId, query);
  }

  /**
   * Lấy chi tiết 1 bản ghi vận động - kiểm tra ownership.
   */
  async findOne(id: string, userId: string) {
    const exercise = await this.exercisesRepo.findById(id);
    if (!exercise)
      throw new NotFoundException('Không tìm thấy bản ghi vận động');
    if (exercise.userId !== userId)
      throw new ForbiddenException('Bạn không có quyền truy cập dữ liệu này');
    return exercise;
  }

  /**
   * Cập nhật bản ghi vận động - chỉ chủ sở hữu mới được phép.
   */
  async update(id: string, userId: string, dto: UpdateExerciseDto) {
    await this.findOne(id, userId); // Ownership check
    return this.exercisesRepo.update(id, dto);
  }

  /**
   * Xóa mềm bản ghi vận động - chỉ chủ sở hữu mới được phép.
   */
  async remove(id: string, userId: string) {
    await this.findOne(id, userId); // Ownership check
    return this.exercisesRepo.softDelete(id);
  }

  /**
   * Lấy lịch sử vận động của một Patient cụ thể (dành cho Doctor/Admin).
   */
  async findByPatientUserId(patientUserId: string, query: ExerciseFilterDto) {
    return this.exercisesRepo.findAll(patientUserId, query);
  }

  /**
   * Tính toán sơ bộ lượng calo tiêu thụ.
   * MET (Metabolic Equivalent of Task) ước lượng:
   *   LOW ~ 3.5 MET, MEDIUM ~ 5.5 MET, HIGH ~ 8.0 MET
   * Công thức: calories = MET * 3.5 * weight(kg) / 200 * duration(phút)
   * Giả định weight = 65kg (giá trị trung bình dân số Việt Nam).
   */
  private estimateCalories(
    duration: number,
    intensity: 'LOW' | 'MEDIUM' | 'HIGH',
  ): number {
    const metMap = { LOW: 3.5, MEDIUM: 5.5, HIGH: 8.0 };
    const met = metMap[intensity];
    const assumedWeight = 65; // kg
    const calories = (met * 3.5 * assumedWeight * duration) / 200;
    return Math.round(calories * 100) / 100;
  }
}
