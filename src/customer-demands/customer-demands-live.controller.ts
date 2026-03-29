import { Controller, Get } from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CustomerDemandsService } from './customer-demands.service';
import { CustomerDemandResponseDto } from './dto/customer-demand-response.dto';

@ApiTags('customer-demands')
@Controller('customer-demands')
export class CustomerDemandsLiveController {
  constructor(private readonly customerDemandsService: CustomerDemandsService) {}

  @Get('live')
  @ApiOperation({
    summary: 'List LIVE customer requests (seller board)',
    description:
      'Returns published demands only. Add auth / shop scoping when you wire production.',
  })
  @ApiOkResponse({ type: CustomerDemandResponseDto, isArray: true })
  listLive(): Promise<CustomerDemandResponseDto[]> {
    return this.customerDemandsService.listLive();
  }
}
