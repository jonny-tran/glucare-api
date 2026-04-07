import { Module } from '@nestjs/common';
import { GlucoseModule } from '../../modules/glucose/glucose.module';
import { MedicationsModule } from '../../modules/medications/medications.module';
import { AiController } from './ai.controller';
import { AiSessionService } from './ai-session.service';
import { AiSessionTitleService } from './ai-session-title.service';
import { AgentService } from './agent.service';
import { AiRepository } from './ai.repository';
import { EmbeddingService } from './embedding.service';
import { FilesService } from './services/files.service';
import { HealthMediaService } from './services/health-media.service';
import { OcrService } from './services/ocr.service';
import { SpeechToTextService } from './services/speech-to-text.service';
import { ToolsRegistryService } from './tools/tools-registry.service';
import { CloudinaryTempCleanupTask } from './cloudinary-temp-cleanup.task';
import { GroqClientService } from './groq-client.service';
import { GoogleGenAiClientService } from './google-genai-client.service';

@Module({
  imports: [GlucoseModule, MedicationsModule],
  controllers: [AiController],
  exports: [FilesService],
  providers: [
    GroqClientService,
    GoogleGenAiClientService,
    AgentService,
    AiSessionService,
    AiSessionTitleService,
    AiRepository,
    ToolsRegistryService,
    EmbeddingService,
    FilesService,
    SpeechToTextService,
    OcrService,
    HealthMediaService,
    CloudinaryTempCleanupTask,
  ],
})
export class AiModule {}
