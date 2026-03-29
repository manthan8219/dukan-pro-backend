import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SellerDashboardMonthlyDto {
  @ApiProperty({ example: 'Mar', description: 'Short month label (UTC calendar month).' })
  month: string;

  @ApiProperty({
    description: 'Gross sales in that month (minor units, paise). Non-cancelled orders by createdAt.',
  })
  revenueMinor: number;

  @ApiPropertyOptional({
    nullable: true,
    description: 'Not computed until cost data exists.',
  })
  profitMinor: number | null;

  @ApiPropertyOptional({
    nullable: true,
    description: 'Not computed until returns/shrinkage data exists.',
  })
  lossMinor: number | null;
}

export class SellerDashboardTopProductDto {
  @ApiProperty()
  name: string;

  @ApiProperty()
  unitsSold: number;

  @ApiProperty({ description: 'Sum of line totals (minor units).' })
  revenueMinor: number;
}

export class SellerDashboardResponseDto {
  @ApiProperty({ example: 'March 2026 (UTC)' })
  periodLabel: string;

  @ApiProperty({
    description:
      'Human-readable note on how metrics are computed (revenue = non-cancelled orders placed in period by createdAt, UTC month).',
  })
  metricsDefinition: string;

  @ApiProperty()
  revenueMonthMinor: number;

  @ApiPropertyOptional({ nullable: true })
  profitMonthMinor: number | null;

  @ApiPropertyOptional({ nullable: true })
  lossMonthMinor: number | null;

  @ApiProperty()
  ordersMonth: number;

  @ApiProperty({ description: 'Average order total in minor units (0 if no orders).' })
  avgOrderValueMinor: number;

  @ApiProperty({
    description: 'Orders not delivered or cancelled (all time).',
  })
  openOrders: number;

  @ApiProperty({
    description: 'Listed SKUs at or below low-stock threshold.',
  })
  lowStockSkus: number;

  @ApiProperty({
    description:
      'Share of distinct buyers this month with 2+ orders this month at this shop (0–100).',
  })
  repeatCustomerPercent: number;

  @ApiProperty({
    description: 'Distinct buyers this month with no prior non-cancelled order at this shop.',
  })
  newCustomersMonth: number;

  @ApiProperty({
    description: 'Distinct buyers this month who had a prior non-cancelled order at this shop.',
  })
  returningCustomersMonth: number;

  @ApiProperty({ type: [SellerDashboardMonthlyDto] })
  monthly: SellerDashboardMonthlyDto[];

  @ApiProperty({ type: [SellerDashboardTopProductDto] })
  topProducts: SellerDashboardTopProductDto[];
}
