import {
  BadRequestException,
  Injectable,
  UnsupportedMediaTypeException,
} from '@nestjs/common';
import { FilesService } from '../ai/services/files.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ProfileRepository } from './profile.repository';

const AVATAR_MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_MIMES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]);

@Injectable()
export class ProfileService {
  constructor(
    private readonly profileRepository: ProfileRepository,
    private readonly filesService: FilesService,
  ) {}

  async getProfile(userId: string) {
    const user = await this.profileRepository.findUserWithProfile(userId);
    if (!user) {
      throw new BadRequestException('Không tìm thấy người dùng');
    }
    const { patient, doctor, ...userInfo } = user;
    let profile: typeof patient | typeof doctor | null = null;
    if (user.role === 'PATIENT' && patient) {
      profile = patient;
    } else if (user.role === 'DOCTOR' && doctor) {
      profile = doctor;
    }
    return {
      ...userInfo,
      profile,
    };
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const user = await this.profileRepository.findUserWithProfile(userId);
    if (!user) {
      throw new BadRequestException('Không tìm thấy người dùng');
    }

    if (dto.fullName !== undefined) {
      await this.profileRepository.updateUserBasics(userId, {
        fullName: dto.fullName,
      });
    }

    if (user.role === 'PATIENT') {
      const p: { gender?: 'M' | 'F' | 'O'; dateOfBirth?: string } = {};
      if (dto.gender !== undefined) p.gender = dto.gender;
      if (dto.dateOfBirth !== undefined) p.dateOfBirth = dto.dateOfBirth;
      if (Object.keys(p).length > 0) {
        await this.profileRepository.updatePatientProfile(userId, p);
      }
    }

    if (user.role === 'DOCTOR') {
      const d: { specialization?: string; hospital?: string } = {};
      if (dto.specialization !== undefined) d.specialization = dto.specialization;
      if (dto.hospital !== undefined) d.hospital = dto.hospital;
      if (Object.keys(d).length > 0) {
        await this.profileRepository.updateDoctorProfile(userId, d);
      }
    }

    return this.getProfile(userId);
  }

  async updateAvatar(
    userId: string,
    file: Express.Multer.File | undefined,
  ) {
    if (!file?.buffer?.length) {
      throw new BadRequestException('Vui lòng gửi file ảnh (field: avatar)');
    }
    if (file.size > AVATAR_MAX_BYTES) {
      throw new BadRequestException('Ảnh không được vượt quá 5MB');
    }
    const mime = file.mimetype?.toLowerCase() ?? '';
    if (!ALLOWED_IMAGE_MIMES.has(mime)) {
      throw new UnsupportedMediaTypeException(
        'Chỉ chấp nhận JPEG, PNG, WebP hoặc GIF',
      );
    }

    const prev = await this.profileRepository.findUserAvatarMeta(userId);
    const upload = await this.filesService.uploadAvatarImage(
      userId,
      file.buffer,
      file.originalname ?? 'avatar',
      mime,
    );

    await this.profileRepository.updateUserBasics(userId, {
      avatarUrl: upload.secureUrl,
      avatarPublicId: upload.publicId,
    });

    if (prev?.avatarPublicId) {
      await this.filesService.destroyByPublicId(
        prev.avatarPublicId,
        'image',
      );
    }

    return this.getProfile(userId);
  }
}
