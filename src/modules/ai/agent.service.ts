import {
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import {
  createPartFromFunctionResponse,
  FunctionCallingConfigMode,
  type Content,
  type Part,
  type Tool,
} from '@google/genai';
import { GlucoseFilterDto } from '../../modules/glucose/dto/glucose-filter.dto';
import { GlucoseService } from '../../modules/glucose/glucose.service';
import { MedicationFilterDto } from '../../modules/medications/dto/medication-filter.dto';
import { MedicationsService } from '../../modules/medications/medications.service';
import { JwtPayload } from '../../modules/auth/interfaces/auth.interface';
import type { KnowledgeArticleHit } from './ai.repository';
import { AiRepository } from './ai.repository';
import { AiChatDto } from './dto/ai-chat.dto';
import { EmbeddingService } from './embedding.service';
import { FilesService } from './services/files.service';
import { HealthMediaService } from './services/health-media.service';
import { ToolsRegistryService } from './tools/tools-registry.service';
import { MEDICAL_DISCLAIMER_AI } from './constants';
import { AiSessionTitleService } from './ai-session-title.service';
import { GeminiClientService } from './gemini-client.service';
import {
  GEMINI_MAINTENANCE_MESSAGE_VI,
  isGeminiQuotaOrRateLimitError,
} from './gemini-quota.util';
import { buildAgentFunctionDeclarations } from './gemini-tool-declarations';
import type { PendingGlucosePayload } from './types/health-media.types';

const MEDICAL_DISCLAIMER = MEDICAL_DISCLAIMER_AI;
const RECENT_HISTORY_WINDOW = 12;
const SUMMARY_TRIGGER_MESSAGES = 20;

type PromptContext = {
  userId: string;
  fullName: string | null;
  age: number | null;
  gender: string | null;
  diabetesType: string;
  summary: string | null;
  facts: string[];
  latestStats: unknown;
};

@Injectable()
export class AgentService {
  private readonly logger = new Logger(AgentService.name);

  constructor(
    private readonly glucoseService: GlucoseService,
    private readonly medicationsService: MedicationsService,
    private readonly aiRepository: AiRepository,
    private readonly embeddingService: EmbeddingService,
    private readonly filesService: FilesService,
    private readonly healthMediaService: HealthMediaService,
    private readonly toolsRegistry: ToolsRegistryService,
    private readonly aiSessionTitleService: AiSessionTitleService,
    private readonly geminiClient: GeminiClientService,
  ) {}

  async chat(user: JwtPayload, dto: AiChatDto, file?: Express.Multer.File) {
    const hasText = !!(dto.message && dto.message.trim());
    if (!hasText && !file) {
      throw new BadRequestException(
        'Vui lòng gửi tin nhắn hoặc file âm thanh/hình ảnh.',
      );
    }

    const { session, isNewSession } = await this.resolveSession(
      user.sub,
      dto.sessionId,
    );
    const sessionRow = await this.aiRepository.findSessionByIdAndUser(
      session.id,
      user.sub,
    );
    if (!sessionRow) {
      throw new BadRequestException('Phiên chat không tồn tại hoặc không hợp lệ');
    }

    const pendingBefore = this.getPendingFromSession(sessionRow);

    if (!file && hasText && pendingBefore) {
      await this.aiRepository.saveMessage(session.id, 'user', dto.message!.trim());
      if (isNewSession) {
        this.aiSessionTitleService.scheduleGenerateTitle(
          session.id,
          dto.message!.trim(),
        );
      }
      return this.handlePendingGlucoseMessage(
        user,
        session.id,
        dto.message!.trim(),
        pendingBefore,
      );
    }

    if (file) {
      const label =
        dto.message?.trim() ||
        '[Tải file âm thanh/hình ảnh để nhận diện chỉ số đường huyết]';
      await this.aiRepository.saveMessage(session.id, 'user', label);
      if (isNewSession) {
        this.aiSessionTitleService.scheduleGenerateTitle(session.id, label);
      }
      if (
        pendingBefore?.cloudinaryPublicId &&
        pendingBefore?.cloudinaryResourceType
      ) {
        await this.filesService.destroyByPublicId(
          pendingBefore.cloudinaryPublicId,
          pendingBefore.cloudinaryResourceType,
        );
      }
      return this.handleHealthMediaUpload(user, session, file);
    }

    await this.aiRepository.saveMessage(session.id, 'user', dto.message!.trim());
    if (isNewSession) {
      this.aiSessionTitleService.scheduleGenerateTitle(
        session.id,
        dto.message!.trim(),
      );
    }

    if (this.isWriteIntent(dto.message!)) {
      const pendingReply = this.withDisclaimer(
        'Yêu cầu này có thể thay đổi dữ liệu sức khỏe. Trạng thái: Pending Confirmation. Vui lòng xác nhận rõ trước khi thực hiện thao tác ghi dữ liệu.',
      );

      await this.aiRepository.saveMessage(session.id, 'assistant', pendingReply);

      return {
        sessionId: session.id,
        status: 'pending_confirmation',
        reply: pendingReply,
      };
    }

    const userContext = await this.aiRepository.getUserContext(user.sub);
    const latestStats = await this.getLatestHealthStats(user.sub);
    const messageCount = await this.aiRepository.countMessages(session.id);

    if (messageCount > SUMMARY_TRIGGER_MESSAGES) {
      await this.summarizeConversation(session.id, user.sub);
    }

    const freshSession = await this.aiRepository.findSessionByIdAndUser(
      session.id,
      user.sub,
    );
    const history = await this.aiRepository.getRecentMessages(
      session.id,
      RECENT_HISTORY_WINDOW,
    );
    const geminiContents = this.chatHistoryToGeminiContents(history);

    const systemInstruction = this.buildSystemPrompt({
      userId: user.sub,
      fullName: userContext?.fullName ?? null,
      age: this.calculateAge(userContext?.patient?.dateOfBirth ?? null),
      gender: userContext?.patient?.gender ?? null,
      diabetesType: userContext?.patient?.diabetesType ?? 'UNKNOWN',
      summary: freshSession?.summary ?? null,
      facts: (freshSession?.context?.facts as string[] | undefined) ?? [],
      latestStats,
    });

    const plainReply = await this.runAssistantWithToolsLoop(
      session.id,
      user,
      geminiContents,
      systemInstruction,
    );

    const finalReply = this.withDisclaimer(plainReply);
    await this.aiRepository.saveMessage(session.id, 'assistant', finalReply);

    return {
      sessionId: session.id,
      status: 'completed',
      reply: finalReply,
    };
  }

  private async resolveSession(userId: string, sessionId?: string) {
    if (!sessionId) {
      const session = await this.aiRepository.createSession(userId);
      return { session, isNewSession: true as const };
    }

    const session = await this.aiRepository.findSessionByIdAndUser(
      sessionId,
      userId,
    );
    if (!session) {
      throw new BadRequestException('Phiên chat không tồn tại hoặc không hợp lệ');
    }

    return { session, isNewSession: false as const };
  }

  private chatHistoryToGeminiContents(
    history: Array<{ role: string; content: string }>,
  ): Content[] {
    const out: Content[] = [];
    for (const item of history) {
      if (item.role === 'user') {
        out.push({ role: 'user', parts: [{ text: item.content }] });
      } else if (item.role === 'assistant') {
        out.push({ role: 'model', parts: [{ text: item.content }] });
      } else if (item.role === 'tool') {
        out.push({
          role: 'model',
          parts: [{ text: `Tool output: ${item.content}` }],
        });
      } else if (item.role === 'system') {
        out.push({
          role: 'model',
          parts: [{ text: `System note: ${item.content}` }],
        });
      }
    }
    return out;
  }

  private async runAssistantWithToolsLoop(
    sessionId: string,
    user: JwtPayload,
    contents: Content[],
    systemInstruction: string,
  ): Promise<string> {
    const ai = this.geminiClient.getClient();
    const model = this.geminiClient.getChatModelId();
    const tools: Tool[] = [
      { functionDeclarations: buildAgentFunctionDeclarations() },
    ];

    const working: Content[] = [...contents];
    let iterations = 0;
    const maxIterations = 15;

    while (iterations++ < maxIterations) {
      let response: Awaited<
        ReturnType<typeof ai.models.generateContent>
      >;
      try {
        response = await ai.models.generateContent({
          model,
          contents: working,
          config: {
            systemInstruction,
            tools,
            toolConfig: {
              functionCallingConfig: {
                mode: FunctionCallingConfigMode.AUTO,
              },
            },
          },
        });
      } catch (e) {
        if (isGeminiQuotaOrRateLimitError(e)) {
          throw new ServiceUnavailableException(GEMINI_MAINTENANCE_MESSAGE_VI);
        }
        throw e;
      }

      const calls = response.functionCalls;
      if (!calls?.length) {
        return response.text?.trim() ?? '';
      }

      const modelContent = response.candidates?.[0]?.content;
      if (modelContent?.parts?.length) {
        working.push(modelContent);
      }

      const responseParts: Part[] = [];
      for (let i = 0; i < calls.length; i++) {
        const fc = calls[i];
        const name = fc.name ?? '';
        const args = (fc.args ?? {}) as Record<string, unknown>;
        const result = await this.dispatchAgentTool(
          name,
          args,
          sessionId,
          user,
        );
        responseParts.push(
          createPartFromFunctionResponse(
            fc.id ?? `fc_${i}`,
            name,
            { output: result } as Record<string, unknown>,
          ),
        );
      }
      working.push({ role: 'user', parts: responseParts });
    }

    throw new ServiceUnavailableException(
      'Vòng gọi tool vượt quá giới hạn an toàn.',
    );
  }

  private async dispatchAgentTool(
    name: string,
    args: Record<string, unknown>,
    sessionId: string,
    user: JwtPayload,
  ): Promise<unknown> {
    try {
      if (name === 'get_glucose_history') {
        const parsed =
          this.toolsRegistry.definitions.get_glucose_history.schema.parse(args);
        const query: GlucoseFilterDto = {
          startDate: parsed.startDate,
          endDate: parsed.endDate,
          page: parsed.page,
          limit: parsed.limit,
        };
        const toolResult = await this.glucoseService.getHistory(user.sub, query);
        await this.aiRepository.saveMessage(
          sessionId,
          'tool',
          JSON.stringify(toolResult),
          {
            tool: 'get_glucose_history',
            input: parsed,
          },
        );
        return toolResult;
      }
      if (name === 'get_medication_logs') {
        const parsed =
          this.toolsRegistry.definitions.get_medication_logs.schema.parse(args);
        const query: MedicationFilterDto = {
          startDate: parsed.startDate,
          endDate: parsed.endDate,
          medicineName: parsed.medicineName,
          page: parsed.page,
          limit: parsed.limit,
        };
        const toolResult = await this.medicationsService.findAll(user.sub, query);
        await this.aiRepository.saveMessage(
          sessionId,
          'tool',
          JSON.stringify(toolResult),
          {
            tool: 'get_medication_logs',
            input: parsed,
          },
        );
        return toolResult;
      }
      if (name === 'search_knowledge_base') {
        const parsed =
          this.toolsRegistry.definitions.search_knowledge_base.schema.parse(args);
        const embed = await this.embeddingService.tryGenerateEmbedding(
          parsed.query,
        );

        let hits: KnowledgeArticleHit[] = [];
        let retrieval:
          | 'semantic'
          | 'fallback'
          | 'embedding_error_fallback' = 'semantic';

        if (embed.ok) {
          hits = await this.aiRepository.findRelatedArticles(
            embed.embedding,
            parsed.language,
            parsed.limit,
          );
          if (hits.length === 0) {
            const rows = await this.aiRepository.searchKnowledgeArticles(
              parsed.query,
              parsed.language,
              parsed.limit,
            );
            hits = this.aiRepository.mapArticlesToFallbackHits(rows);
            retrieval = 'fallback';
          }
        } else {
          retrieval = 'embedding_error_fallback';
          const rows = await this.aiRepository.searchKnowledgeArticles(
            parsed.query,
            parsed.language,
            parsed.limit,
          );
          hits = this.aiRepository.mapArticlesToFallbackHits(rows);
        }

        const ragContext = this.buildRagContext(hits);
        const toolResult = {
          retrieval,
          embeddingError: !embed.ok ? embed.error : undefined,
          ragContext,
          sources: hits.map((h) => ({
            id: h.id,
            title: h.title,
            categoryName: h.categoryName,
            distance: h.distance,
          })),
        };

        await this.aiRepository.saveMessage(
          sessionId,
          'tool',
          JSON.stringify(toolResult),
          {
            tool: 'search_knowledge_base',
            input: parsed,
          },
        );
        return toolResult;
      }
      if (name === 'process_health_media') {
        const parsed =
          this.toolsRegistry.definitions.process_health_media.schema.parse(args);
        const resourceType =
          parsed.resourceType ??
          (parsed.fileType === 'image' ? 'image' : 'video');
        const result = await this.healthMediaService.processBySecureUrl(
          parsed.secureUrl,
          parsed.fileType,
          user.sub,
        );
        if (!result.ok) {
          await this.filesService.destroyByPublicId(
            parsed.publicId,
            resourceType,
          );
          const errOut = {
            ok: false,
            error: result.error,
            code: result.code,
          };
          await this.aiRepository.saveMessage(
            sessionId,
            'tool',
            JSON.stringify(errOut),
            { tool: 'process_health_media', input: parsed },
          );
          return errOut;
        }
        const pending = this.toPendingPayload(result.extracted, {
          cloudinaryPublicId: parsed.publicId,
          cloudinaryResourceType: resourceType,
        });
        await this.aiRepository.mergeSessionContext(sessionId, {
          pendingGlucose: pending,
        });
        const out = {
          ok: true,
          value: result.extracted.value,
          context: result.extracted.context,
          confidence: result.extracted.confidence,
          unusualSpike: result.extracted.unusualSpike,
          pendingConfirmationRequired: true,
          instruction:
            'Hỏi người dùng xác nhận trước khi coi như đã lưu. Không tự ghi DB.',
        };
        await this.aiRepository.saveMessage(
          sessionId,
          'tool',
          JSON.stringify(out),
          { tool: 'process_health_media', input: parsed },
        );
        return out;
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return { error: msg };
    }

    return { error: `Tool không xác định: ${name}` };
  }

  private buildSystemPrompt(context: PromptContext) {
    const profileLine = [
      `Tên: ${context.fullName ?? 'Chưa có'}`,
      `Tuổi: ${context.age ?? 'Chưa có'}`,
      `Giới tính: ${context.gender ?? 'Chưa có'}`,
      `Loại tiểu đường: ${context.diabetesType}`,
    ].join(' | ');

    const statsLine = context.latestStats
      ? JSON.stringify(context.latestStats)
      : 'Chưa có thống kê gần nhất.';

    const factsLine =
      context.facts.length > 0 ? context.facts.join('; ') : 'Chưa có.';

    return [
      'Bạn là trợ lý AI cho hệ thống GlucoDia (không phải bác sĩ). Không chẩn đoán, không kê đơn, không thay thế tư vấn y khoa trực tiếp.',
      `Người dùng hiện tại: ${context.userId}.`,
      `Permanent Context hồ sơ: ${profileLine}.`,
      `Global Summary: ${context.summary ?? 'Chưa có tóm tắt phiên trước đó.'}`,
      `Entity Facts đã biết: ${factsLine}`,
      `Thống kê sức khỏe gần nhất: ${statsLine}`,
      'TUYỆT ĐỐI chỉ truy cập dữ liệu của đúng user hiện tại thông qua tool.',
      'Khi có thể, hãy tận dụng tool để trả lời chính xác dựa trên dữ liệu thật.',
      'Khi tool search_knowledge_base trả về ragContext từ kho bài viết, ưu tiên dùng nội dung đó và trích dẫn rõ nguồn (tiêu đề, id). Không bịa đặt trích dẫn nếu ragContext trống.',
      'Nếu yêu cầu liên quan ghi/xóa dữ liệu, KHÔNG thực thi ngay; trả về trạng thái Pending Confirmation và hỏi lại để xác nhận.',
      'Tool process_health_media cần secureUrl + publicId Cloudinary (và resourceType nếu có); chỉ trích xuất chỉ số, không bao giờ tự lưu E-04. Luôn hỏi xác nhận người dùng trước khi coi như đã ghi nhận.',
      'Tự nhận diện các facts ổn định về thói quen người dùng (ăn uống, giờ giấc, ưu tiên), phản ánh trong câu trả lời ngắn gọn.',
      'Trả lời ngắn gọn, dễ hiểu, ưu tiên tiếng Việt.',
    ].join('\n');
  }

  private async summarizeConversation(sessionId: string, userId: string) {
    const allMessages = await this.aiRepository.getAllMessages(sessionId);
    if (allMessages.length <= SUMMARY_TRIGGER_MESSAGES) {
      return;
    }

    const convoText = allMessages
      .map((m) => `[${m.role}] ${m.content}`)
      .join('\n');

    const ai = this.geminiClient.getClient();
    const model = this.geminiClient.getChatModelId();
    let summaryRes: Awaited<ReturnType<typeof ai.models.generateContent>>;
    try {
      summaryRes = await ai.models.generateContent({
        model,
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: `User ID: ${userId}\n\nHội thoại:\n${convoText}`,
              },
            ],
          },
        ],
        config: {
          systemInstruction: [
            'Bạn tóm tắt hội thoại y tế cho trợ lý AI nội bộ.',
            'Trả về 2 phần rõ ràng:',
            '1) SUMMARY: tóm tắt ngắn bối cảnh và quyết định quan trọng.',
            '2) FACTS: danh sách facts bền vững về người dùng dạng gạch đầu dòng.',
            'Không thêm disclaimer.',
          ].join('\n'),
        },
      });
    } catch (e) {
      if (isGeminiQuotaOrRateLimitError(e)) {
        this.logger.warn(
          'summarizeConversation: bỏ qua do quota/rate limit Gemini (429).',
        );
        return;
      }
      throw e;
    }

    const summary = (summaryRes.text ?? '').trim();
    const facts = this.extractFacts(summary);

    await this.aiRepository.updateSessionSummary(sessionId, summary, {
      facts,
      updatedAt: new Date().toISOString(),
    });
  }

  private withDisclaimer(text: string) {
    const normalized = text?.trim() || 'Hiện tại tôi chưa thể tạo phản hồi.';
    if (normalized.includes(MEDICAL_DISCLAIMER)) {
      return normalized;
    }

    return `${normalized}\n\n${MEDICAL_DISCLAIMER}`;
  }

  private isWriteIntent(message: string) {
    const value = message.toLowerCase();
    // Sử dụng Regex với \b để đảm bảo match nguyên từ
    // Ví dụ: "ghi" sẽ match, nhưng "nghiệm" hoặc "ghi nhận" (nếu không có dấu cách) sẽ không match lầm
    const keywords = [
      'ghi',
      'thêm',
      'tạo',
      'cập nhật',
      'xóa',
      'delete',
      'create',
      'update',
      'log glucose',
      'log meal',
      'log medication',
    ];
  
    return keywords.some((kw) => {
      // Tạo regex: \bghi\b, \btạo\b...
      const regex = new RegExp(`\\b${kw}\\b`, 'i');
      return regex.test(value);
    });
  }

  private calculateAge(dateOfBirth: Date | string | null) {
    if (!dateOfBirth) {
      return null;
    }

    const date = typeof dateOfBirth === 'string' ? new Date(dateOfBirth) : dateOfBirth;
    if (Number.isNaN(date.getTime())) {
      return null;
    }

    const now = new Date();
    let age = now.getFullYear() - date.getFullYear();
    const m = now.getMonth() - date.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < date.getDate())) {
      age -= 1;
    }

    return age;
  }

  private async getLatestHealthStats(userId: string) {
    try {
      return await this.glucoseService.getDashboardData(userId);
    } catch {
      return null;
    }
  }

  private buildRagContext(hits: KnowledgeArticleHit[]): string {
    if (hits.length === 0) {
      return 'Không tìm thấy bài viết liên quan trong kho kiến thức đã xuất bản.';
    }
    return hits
      .map((h, i) => {
        const cat = h.categoryName ? ` — ${h.categoryName}` : '';
        const dist =
          h.distance != null && Number.isFinite(h.distance)
            ? ` | khoảng cách cosine: ${h.distance.toFixed(4)}`
            : '';
        return `[Nguồn ${i + 1}: ${h.title}${cat}${dist} | id=${h.id}]\n${h.snippet}`;
      })
      .join('\n\n---\n\n');
  }

  private getPendingFromSession(session: {
    context: unknown;
  }): PendingGlucosePayload | undefined {
    const ctx = session.context as Record<string, unknown> | null | undefined;
    if (!ctx?.pendingGlucose) {
      return undefined;
    }
    return ctx.pendingGlucose as PendingGlucosePayload;
  }

  private async handlePendingGlucoseMessage(
    user: JwtPayload,
    sessionId: string,
    message: string,
    pending: PendingGlucosePayload,
  ) {
    const norm = message
      .trim()
      .toLowerCase()
      .replace(/[.,!?]/g, '');

    if (this.isCancelWord(norm)) {
      if (pending.cloudinaryPublicId && pending.cloudinaryResourceType) {
        await this.filesService.destroyByPublicId(
          pending.cloudinaryPublicId,
          pending.cloudinaryResourceType,
        );
      }
      await this.aiRepository.mergeSessionContext(sessionId, {
        pendingGlucose: null,
      });
      const reply = this.withDisclaimer(
        'Đã hủy, không lưu chỉ số đường huyết.',
      );
      await this.aiRepository.saveMessage(sessionId, 'assistant', reply);
      return {
        sessionId,
        status: 'cancelled' as const,
        reply,
      };
    }

    if (this.isConfirmWord(norm)) {
      const created = await this.glucoseService.create(user.sub, {
        glucoseValue: pending.glucoseValue,
        mealContext: pending.mealContext,
        readingType: pending.readingType,
        recordedAt: pending.recordedAtIso,
        notes: pending.notes,
      });
      if (pending.cloudinaryPublicId && pending.cloudinaryResourceType) {
        await this.filesService.destroyByPublicId(
          pending.cloudinaryPublicId,
          pending.cloudinaryResourceType,
        );
      }
      await this.aiRepository.mergeSessionContext(sessionId, {
        pendingGlucose: null,
      });
      const reply = this.withDisclaimer(
        `Đã lưu chỉ số ${pending.glucoseValue} mg/dL vào nhật ký.`,
      );
      await this.aiRepository.saveMessage(sessionId, 'assistant', reply);
      return {
        sessionId,
        status: 'saved' as const,
        reply,
        readingId: created.id,
      };
    }

    const reply = this.withDisclaimer(
      'Vui lòng trả lời rõ "có" để lưu hoặc "không" để hủy.',
    );
    await this.aiRepository.saveMessage(sessionId, 'assistant', reply);
    return {
      sessionId,
      status: 'awaiting_glucose_confirmation' as const,
      reply,
    };
  }

  private async handleHealthMediaUpload(
    user: JwtPayload,
    session: { id: string },
    file: Express.Multer.File,
  ) {
    const upload = await this.filesService.uploadBuffer(
      file.buffer,
      file.originalname,
      file.mimetype,
    );
    const result = await this.healthMediaService.processBySecureUrl(
      upload.secureUrl,
      upload.fileType,
      user.sub,
    );

    if (!result.ok) {
      await this.filesService.destroyByPublicId(
        upload.publicId,
        upload.resourceType,
      );
      const reply = this.withDisclaimer(
        result.error || 'Không xử lý được file.',
      );
      await this.aiRepository.saveMessage(session.id, 'assistant', reply);
      return {
        sessionId: session.id,
        status: 'error' as const,
        reply,
        code: result.code,
      };
    }

    const pending = this.toPendingPayload(result.extracted, {
      cloudinaryPublicId: upload.publicId,
      cloudinaryResourceType: upload.resourceType,
    });
    await this.aiRepository.mergeSessionContext(session.id, {
      pendingGlucose: pending,
    });

    const body = this.buildConfirmationReply(result.extracted);
    const finalReply = this.withDisclaimer(body);
    await this.aiRepository.saveMessage(session.id, 'assistant', finalReply);

    return {
      sessionId: session.id,
      status: 'awaiting_glucose_confirmation' as const,
      reply: finalReply,
      extracted: {
        value: result.extracted.value,
        context: result.extracted.context,
        confidence: result.extracted.confidence,
        unusualSpike: result.extracted.unusualSpike,
      },
    };
  }

  private toPendingPayload(
    extracted: {
      value: number;
      context: string;
      confidence: number;
      mealContext: PendingGlucosePayload['mealContext'];
      readingType: PendingGlucosePayload['readingType'];
      notes?: string;
      rawTranscript: string;
      unusualSpike: boolean;
      lastReadingValue?: number;
    },
    media?: {
      cloudinaryPublicId: string;
      cloudinaryResourceType: string;
    },
  ): PendingGlucosePayload {
    return {
      glucoseValue: extracted.value,
      mealContext: extracted.mealContext,
      readingType: extracted.readingType,
      notes: extracted.notes,
      recordedAtIso: new Date().toISOString(),
      confidence: extracted.confidence,
      rawTranscript: extracted.rawTranscript,
      unusualSpike: extracted.unusualSpike,
      lastReadingValue: extracted.lastReadingValue,
      cloudinaryPublicId: media?.cloudinaryPublicId,
      cloudinaryResourceType: media?.cloudinaryResourceType,
    };
  }

  private buildConfirmationReply(extracted: {
    value: number;
    context: string;
    unusualSpike: boolean;
    lastReadingValue?: number;
  }): string {
    if (
      extracted.unusualSpike &&
      extracted.lastReadingValue != null &&
      Number.isFinite(extracted.lastReadingValue)
    ) {
      return (
        `Tôi nhận diện chỉ số ${extracted.value} mg/dL (${extracted.context}). ` +
        `So với lần đo gần nhất (${extracted.lastReadingValue} mg/dL), mức chênh lệch lớn — bạn có chắc chính xác không? ` +
        `Bạn xác nhận lưu thông tin này vào nhật ký không?`
      );
    }
    return (
      `Tôi thấy chỉ số của bạn là ${extracted.value} mg/dL (${extracted.context}). ` +
      `Bạn xác nhận lưu thông tin này vào nhật ký không?`
    );
  }

  private isConfirmWord(norm: string): boolean {
    const words = [
      'có',
      'đồng ý',
      'ok',
      'xác nhận',
      'lưu',
      'yes',
      'đúng',
      'phải',
      'được',
      'chắc chắn',
      'vâng',
      'dạ',
    ];
    return words.some((w) => norm === w || norm.startsWith(`${w} `));
  }

  private isCancelWord(norm: string): boolean {
    const words = [
      'không',
      'hủy',
      'cancel',
      'bỏ qua',
      'no',
      'skip',
      'thôi',
    ];
    return words.some((w) => norm === w || norm.startsWith(`${w} `));
  }

  private extractFacts(summary: string) {
    return summary
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.startsWith('-'))
      .map((line) => line.replace(/^-+\s*/, ''))
      .filter(Boolean)
      .slice(0, 10);
  }
}
