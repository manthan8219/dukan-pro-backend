import { Controller, Post } from '@nestjs/common';
import { ApiCreatedResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SessionIdResponseDto } from './dto/session-id-response.dto';
import { ScannerSessionService } from './scanner-session.service';

@ApiTags('scanner-session')
@Controller('session')
export class ScannerSessionController {
  constructor(private readonly scannerSession: ScannerSessionService) {}

  @Post()
  @ApiOperation({ summary: 'Create a barcode relay session' })
  @ApiCreatedResponse({ type: SessionIdResponseDto })
  createSession(): SessionIdResponseDto {
    return { sessionId: this.scannerSession.createSession() };
  }
}
