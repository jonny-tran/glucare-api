import type { FunctionDeclaration } from '@google/genai';
import type { z } from 'zod';
import { toJSONSchema } from 'zod';
import {
  getGlucoseHistorySchema,
  getMedicationLogsSchema,
  processHealthMediaSchema,
  searchKnowledgeBaseSchema,
} from './tools/tools-registry.service';

function zodToParams(schema: z.ZodType): unknown {
  return toJSONSchema(schema);
}

/** Khai báo function cho Gemini (functionDeclarations + JSON Schema từ Zod). */
export function buildAgentFunctionDeclarations(): FunctionDeclaration[] {
  return [
    {
      name: 'get_glucose_history',
      description:
        'Lấy lịch sử đường huyết của chính người dùng hiện tại theo khoảng ngày.',
      parametersJsonSchema: zodToParams(getGlucoseHistorySchema),
    },
    {
      name: 'get_medication_logs',
      description:
        'Lấy nhật ký thuốc của chính người dùng hiện tại theo khoảng ngày hoặc tên thuốc.',
      parametersJsonSchema: zodToParams(getMedicationLogsSchema),
    },
    {
      name: 'search_knowledge_base',
      description:
        'Tìm kiếm ngữ nghĩa (RAG) trong kho bài viết y khoa đã xuất bản (E-12), dùng embedding + pgvector.',
      parametersJsonSchema: zodToParams(searchKnowledgeBaseSchema),
    },
    {
      name: 'process_health_media',
      description:
        'Xử lý file đã có trên Cloudinary: secureUrl + publicId (và tùy chọn resourceType từ upload). Gemini đa phương thức cho ảnh/âm thanh. Không tự lưu DB — chỉ trả kết quả; hệ thống sẽ hỏi xác nhận người dùng.',
      parametersJsonSchema: zodToParams(processHealthMediaSchema),
    },
  ];
}
