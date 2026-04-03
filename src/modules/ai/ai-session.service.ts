import { Injectable, NotFoundException } from '@nestjs/common';
import { AiRepository } from './ai.repository';
import { MEDICAL_DISCLAIMER_AI } from './constants';
import type { UpdateAiSessionDto } from './dto/update-ai-session.dto';

@Injectable()
export class AiSessionService {
  constructor(private readonly aiRepository: AiRepository) {}

  async listSessions(userId: string) {
    const sessions = await this.aiRepository.findSessionsByUser(userId);
    return {
      sessions: sessions.map((s) => ({
        id: s.id,
        title: s.title,
        sessionType: s.sessionType,
        status: s.status,
        summary: s.summary,
        createdAt: s.createdAt,
        updatedAt: s.updatedAt,
      })),
    };
  }

  async getSessionMessages(
    userId: string,
    sessionId: string,
    page: number,
    limit: number,
  ) {
    const result = await this.aiRepository.findMessagesForSessionPaginated(
      sessionId,
      userId,
      page,
      limit,
    );

    if (!result) {
      throw new NotFoundException('Không tìm thấy phiên chat hoặc đã bị xóa.');
    }

    const totalPages = Math.max(1, Math.ceil(result.total / result.limit));

    return {
      session: {
        id: result.session.id,
        title: result.session.title,
        sessionType: result.session.sessionType,
        status: result.session.status,
        createdAt: result.session.createdAt,
        updatedAt: result.session.updatedAt,
      },
      messages: result.messages.map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        metadata: m.metadata,
        createdAt: m.createdAt,
      })),
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages,
      },
      /** BR-07: nhắc client hiển thị / lưu trữ kèm ngữ cảnh pháp lý khi xuất báo cáo. */
      medicalDisclaimer: MEDICAL_DISCLAIMER_AI,
    };
  }

  async renameSession(
    userId: string,
    sessionId: string,
    dto: UpdateAiSessionDto,
  ) {
    const updated = await this.aiRepository.updateSession(sessionId, userId, {
      title: dto.title,
    });
    if (!updated) {
      throw new NotFoundException('Không tìm thấy phiên chat hoặc đã bị xóa.');
    }
    return {
      id: updated.id,
      title: updated.title,
      updatedAt: updated.updatedAt,
    };
  }

  async softDeleteSession(userId: string, sessionId: string) {
    const updated = await this.aiRepository.softDeleteSession(sessionId, userId);
    if (!updated) {
      throw new NotFoundException('Không tìm thấy phiên chat hoặc đã bị xóa.');
    }
    return { id: updated.id, deleted: true as const };
  }
}
