import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ContentKind } from '../content/content-kind.enum';
import { ContentService } from '../content/content.service';
import { ShopsService } from '../shops/shops.service';
import { CreateShopBillingDocumentDto } from './dto/create-shop-billing-document.dto';
import { ListShopBillingDocumentsQueryDto } from './dto/list-shop-billing-documents-query.dto';
import { ShopBillingDocumentResponseDto } from './dto/shop-billing-document-response.dto';
import { UpdateShopBillingDocumentDto } from './dto/update-shop-billing-document.dto';
import { ShopBillingDocument } from './entities/shop-billing-document.entity';
import { ShopBillingDocumentType } from './enums/shop-billing-document-type.enum';
import { ShopBillingPaymentStatus } from './enums/shop-billing-payment-status.enum';

function snapshotGrandTotalRupee(snapshot: Record<string, unknown>): number {
  const g = snapshot.grandTotal;
  if (typeof g === 'number' && Number.isFinite(g)) {
    return g;
  }
  throw new BadRequestException('snapshot.grandTotal must be a finite number');
}

function toMinor(rupees: number): number {
  return Math.round(rupees * 100);
}

function assertGrandTotalMinorMatches(
  snapshot: Record<string, unknown>,
  grandTotalMinor: number,
): void {
  const expected = toMinor(snapshotGrandTotalRupee(snapshot));
  if (Math.abs(expected - grandTotalMinor) > 1) {
    throw new BadRequestException(
      'grandTotalMinor does not match snapshot.grandTotal (expected paise from rupees × 100)',
    );
  }
}

function sliceDate(s: string | undefined | null): string | null {
  if (s == null || typeof s !== 'string') return null;
  const t = s.trim();
  if (t.length >= 10) return t.slice(0, 10);
  return null;
}

function issueDateFromCreate(dto: CreateShopBillingDocumentDto): string {
  const explicit = sliceDate(dto.issueDate);
  if (explicit) return explicit;
  const fromSnap = sliceDate(
    typeof dto.snapshot.date === 'string' ? dto.snapshot.date : undefined,
  );
  if (fromSnap) return fromSnap;
  return new Date().toISOString().slice(0, 10);
}

function dueDateFromCreate(dto: CreateShopBillingDocumentDto): string | null {
  if (dto.dueDate === null) return null;
  const explicit = sliceDate(dto.dueDate ?? undefined);
  if (explicit) return explicit;
  return sliceDate(
    typeof dto.snapshot.dueDate === 'string'
      ? dto.snapshot.dueDate
      : undefined,
  );
}

function parsePaymentStatusFromSnapshot(
  snapshot: Record<string, unknown>,
): ShopBillingPaymentStatus {
  const raw = snapshot.paymentStatus;
  if (typeof raw !== 'string') {
    return ShopBillingPaymentStatus.UNPAID;
  }
  const u = raw.toUpperCase();
  if (u === 'PAID') return ShopBillingPaymentStatus.PAID;
  if (u === 'PARTIAL') return ShopBillingPaymentStatus.PARTIAL;
  return ShopBillingPaymentStatus.UNPAID;
}

function paidAmountMinorFromSnapshot(snapshot: Record<string, unknown>): number {
  const p = snapshot.paidAmount;
  if (typeof p === 'number' && Number.isFinite(p) && p >= 0) {
    return toMinor(p);
  }
  return 0;
}

@Injectable()
export class ShopBillingDocumentsService {
  constructor(
    @InjectRepository(ShopBillingDocument)
    private readonly repo: Repository<ShopBillingDocument>,
    private readonly shopsService: ShopsService,
    private readonly contentService: ContentService,
  ) {}

  private toDto(row: ShopBillingDocument): ShopBillingDocumentResponseDto {
    return {
      id: row.id,
      shopId: row.shopId,
      documentType: row.documentType,
      documentNumber: row.documentNumber,
      clientLocalId: row.clientLocalId,
      grandTotalMinor: row.grandTotalMinor,
      currency: row.currency,
      issueDate: row.issueDate,
      dueDate: row.dueDate,
      paymentStatus: row.paymentStatus,
      paidAmountMinor: row.paidAmountMinor,
      snapshot: row.snapshot,
      pdfContentId: row.pdfContentId,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  private async assertPdfOwnedByUser(
    userId: string,
    pdfContentId: string,
  ): Promise<void> {
    const c = await this.contentService.findOne(pdfContentId);
    if (c.ownerUserId !== userId) {
      throw new ForbiddenException(
        'PDF content must belong to your user (same owner as upload)',
      );
    }
    if (
      c.kind !== ContentKind.DOCUMENT &&
      c.kind !== ContentKind.BILL &&
      c.kind !== ContentKind.OTHER
    ) {
      throw new BadRequestException(
        'pdfContentId must reference content kind DOCUMENT, BILL, or OTHER',
      );
    }
  }

  async create(
    shopId: string,
    ownerUserId: string,
    dto: CreateShopBillingDocumentDto,
  ): Promise<ShopBillingDocumentResponseDto> {
    await this.shopsService.findOneOwnedByUser(shopId, ownerUserId);

    assertGrandTotalMinorMatches(dto.snapshot, dto.grandTotalMinor);

    const clientLocalId = dto.clientLocalId?.trim() || null;
    if (clientLocalId) {
      const existing = await this.repo.findOne({
        where: {
          shopId,
          clientLocalId,
          isDeleted: false,
        },
      });
      if (existing) {
        return this.toDto(existing);
      }
    }

    if (dto.pdfContentId) {
      await this.assertPdfOwnedByUser(ownerUserId, dto.pdfContentId);
    }

    const issueDate = issueDateFromCreate(dto);
    const dueDate = dueDateFromCreate(dto);
    const currency = dto.currency?.trim().toUpperCase() || 'INR';

    let paymentStatus: ShopBillingPaymentStatus | null;
    let paidAmountMinor: number;
    if (dto.documentType === ShopBillingDocumentType.QUOTATION) {
      paymentStatus = null;
      paidAmountMinor = 0;
    } else {
      paymentStatus =
        dto.paymentStatus ?? parsePaymentStatusFromSnapshot(dto.snapshot);
      paidAmountMinor =
        dto.paidAmountMinor ?? paidAmountMinorFromSnapshot(dto.snapshot);
    }

    const row = this.repo.create({
      shopId,
      documentType: dto.documentType,
      documentNumber: dto.documentNumber.trim(),
      clientLocalId,
      grandTotalMinor: dto.grandTotalMinor,
      currency,
      issueDate,
      dueDate,
      paymentStatus,
      paidAmountMinor,
      snapshot: dto.snapshot,
      pdfContentId: dto.pdfContentId?.trim() ?? null,
      createdBy: ownerUserId,
      updatedBy: ownerUserId,
    });
    const saved = await this.repo.save(row);
    return this.toDto(saved);
  }

  async listForShop(
    shopId: string,
    ownerUserId: string,
    query: ListShopBillingDocumentsQueryDto,
  ): Promise<ShopBillingDocumentResponseDto[]> {
    await this.shopsService.findOneOwnedByUser(shopId, ownerUserId);
    const limit = query.limit ?? 50;
    const offset = query.offset ?? 0;

    const qb = this.repo
      .createQueryBuilder('d')
      .where('d.shopId = :shopId', { shopId })
      .andWhere('d.isDeleted = false')
      .orderBy('d.issueDate', 'DESC')
      .addOrderBy('d.createdAt', 'DESC')
      .take(limit)
      .skip(offset);

    if (query.documentType) {
      qb.andWhere('d.documentType = :dt', { dt: query.documentType });
    }

    const rows = await qb.getMany();
    return rows.map((r) => this.toDto(r));
  }

  async findOneForShop(
    shopId: string,
    ownerUserId: string,
    id: string,
  ): Promise<ShopBillingDocumentResponseDto> {
    await this.shopsService.findOneOwnedByUser(shopId, ownerUserId);
    const row = await this.repo.findOne({
      where: { id, shopId, isDeleted: false },
    });
    if (!row) {
      throw new NotFoundException(`Billing document ${id} not found`);
    }
    return this.toDto(row);
  }

  async updateForShop(
    shopId: string,
    ownerUserId: string,
    id: string,
    dto: UpdateShopBillingDocumentDto,
  ): Promise<ShopBillingDocumentResponseDto> {
    await this.shopsService.findOneOwnedByUser(shopId, ownerUserId);
    const row = await this.repo.findOne({
      where: { id, shopId, isDeleted: false },
    });
    if (!row) {
      throw new NotFoundException(`Billing document ${id} not found`);
    }

    if (dto.pdfContentId !== undefined && dto.pdfContentId) {
      await this.assertPdfOwnedByUser(ownerUserId, dto.pdfContentId);
    }

    if (dto.snapshot !== undefined) {
      row.snapshot = dto.snapshot;
      if (dto.grandTotalMinor !== undefined) {
        assertGrandTotalMinorMatches(dto.snapshot, dto.grandTotalMinor);
        row.grandTotalMinor = dto.grandTotalMinor;
      } else {
        row.grandTotalMinor = toMinor(snapshotGrandTotalRupee(dto.snapshot));
      }
    } else if (dto.grandTotalMinor !== undefined) {
      assertGrandTotalMinorMatches(row.snapshot, dto.grandTotalMinor);
      row.grandTotalMinor = dto.grandTotalMinor;
    }

    if (dto.dueDate !== undefined) {
      row.dueDate = dto.dueDate === null ? null : sliceDate(dto.dueDate);
    }
    if (dto.paymentStatus !== undefined) {
      row.paymentStatus = dto.paymentStatus;
    }
    if (dto.paidAmountMinor !== undefined) {
      row.paidAmountMinor = dto.paidAmountMinor;
    }
    if (dto.pdfContentId !== undefined) {
      row.pdfContentId = dto.pdfContentId;
    }
    if (dto.documentNumber !== undefined) {
      row.documentNumber = dto.documentNumber.trim();
    }

    row.updatedBy = ownerUserId;
    const saved = await this.repo.save(row);
    return this.toDto(saved);
  }

  async removeForShop(
    shopId: string,
    ownerUserId: string,
    id: string,
  ): Promise<void> {
    await this.shopsService.findOneOwnedByUser(shopId, ownerUserId);
    const row = await this.repo.findOne({
      where: { id, shopId, isDeleted: false },
    });
    if (!row) {
      throw new NotFoundException(`Billing document ${id} not found`);
    }
    row.isDeleted = true;
    row.deletedAt = new Date();
    row.deletedBy = ownerUserId;
    await this.repo.save(row);
  }
}
