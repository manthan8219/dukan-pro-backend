import { Module } from '@nestjs/common';
import { ScannerSessionController } from './scanner-session.controller';
import { ScannerSessionGateway } from './scanner-session.gateway';
import { ScannerSessionService } from './scanner-session.service';

@Module({
  controllers: [ScannerSessionController],
  providers: [ScannerSessionService, ScannerSessionGateway],
  exports: [ScannerSessionService],
})
export class ScannerSessionModule {}
