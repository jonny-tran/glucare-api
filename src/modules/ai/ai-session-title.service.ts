import { Injectable, Logger } from '@nestjs/common';
import { generateText } from 'ai';
import { AiRepository } from './ai.repository';
import { GroqClientService } from './groq-client.service';

const DEFAULT_SESSION_TITLE = 'Cuộc trò chuyện mới';

@Injectable()
export class AiSessionTitleService {
  private readonly logger = new Logger(AiSessionTitleService.name);

  constructor(
    private readonly groqClient: GroqClientService,
    private readonly aiRepository: AiRepository,
  ) {}

  /**
   * Tạo tiêu đề 3–5 từ (tiếng Việt) nền, không chặn luồng chat.
   */
  scheduleGenerateTitle(sessionId: string, firstUserText: string): void {
    const snippet = firstUserText.trim();
    if (!snippet) {
      return;
    }
    void this.generateAndPersistTitle(sessionId, snippet).catch((e) => {
      const msg = e instanceof Error ? e.message : String(e);
      this.logger.warn(`Không tạo được tiêu đề phiên ${sessionId}: ${msg}`);
    });
  }

  private async generateAndPersistTitle(
    sessionId: string,
    firstUserText: string,
  ) {
    const model = this.groqClient.tryGetLanguageModel();
    if (!model) {
      return;
    }

    const snippet = firstUserText.slice(0, 500);

    const { text } = await generateText({
      model,
      prompt: [
        'Đặt tiêu đề ngắn cho cuộc trò chuyện y tế (GlucoDia).',
        'Chỉ trả về 3–5 từ tiếng Việt, không dấu ngoặc, không dấu chấm cuối, không xuống dòng.',
        'Không dùng từ "tiêu đề" hay "chat".',
        '',
        `Tin nhắn đầu tiên của người dùng:\n${snippet}`,
      ].join('\n'),
    });

    const title = (text ?? '')
      .trim()
      .replace(/\s+/g, ' ')
      .replace(/[.!?…]+$/u, '')
      .slice(0, 255);

    if (title.length < 2) {
      return;
    }

    await this.aiRepository.updateSessionTitleIfDefault(
      sessionId,
      title,
      DEFAULT_SESSION_TITLE,
    );
  }
}
