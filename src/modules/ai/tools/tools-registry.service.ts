import { Injectable } from '@nestjs/common';
import { z } from 'zod';

export const getGlucoseHistorySchema = z.object({
  startDate: z.string().date().optional(),
  endDate: z.string().date().optional(),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(50).default(10),
});

export const getMedicationLogsSchema = z.object({
  startDate: z.string().date().optional(),
  endDate: z.string().date().optional(),
  medicineName: z.string().min(1).optional(),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(50).default(10),
});

/** RAG: semantic search over E-12 (pgvector + embeddings) */
export const searchKnowledgeBaseSchema = z.object({
  query: z.string().min(2),
  language: z.enum(['VI', 'EN']).default('VI'),
  limit: z.number().int().min(1).max(5).default(3),
});

export const processHealthMediaSchema = z.object({
  secureUrl: z
    .string()
    .url()
    .describe('HTTPS secure URL từ Cloudinary sau khi upload (res.cloudinary.com)'),
  publicId: z
    .string()
    .min(1)
    .describe('public_id đầy đủ trên Cloudinary (vd: glucodia/temp/audio/...)'),
  fileType: z.enum(['audio', 'image']),
  resourceType: z
    .enum(['image', 'video', 'raw'])
    .optional()
    .describe(
      'resource_type từ phản hồi upload (khuyến nghị). Nếu thiếu: ảnh→image, âm thanh→video',
    ),
});

@Injectable()
export class ToolsRegistryService {
  readonly definitions = {
    get_glucose_history: {
      name: 'get_glucose_history',
      description:
        'Lấy lịch sử đường huyết của chính người dùng hiện tại theo khoảng ngày.',
      schema: getGlucoseHistorySchema,
    },
    get_medication_logs: {
      name: 'get_medication_logs',
      description:
        'Lấy nhật ký thuốc của chính người dùng hiện tại theo khoảng ngày hoặc tên thuốc.',
      schema: getMedicationLogsSchema,
    },
    search_knowledge_base: {
      name: 'search_knowledge_base',
      description:
        'Tìm kiếm ngữ nghĩa (RAG) trong kho bài viết y khoa đã xuất bản (E-12), dùng embedding + pgvector.',
      schema: searchKnowledgeBaseSchema,
    },
    process_health_media: {
      name: 'process_health_media',
      description:
        'Xử lý file đã có trên Cloudinary: secureUrl + publicId (và tùy chọn resourceType từ upload). Gemini đa phương thức (âm thanh + ảnh). Không tự lưu DB — chỉ trả kết quả; hệ thống sẽ hỏi xác nhận người dùng.',
      schema: processHealthMediaSchema,
    },
  } as const;
}
