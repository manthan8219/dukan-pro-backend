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
import { ResendService } from '../email/resend.service';
import { ShopsService } from '../shops/shops.service';
import { CreateShopBillingDocumentDto } from './dto/create-shop-billing-document.dto';
import { ListShopBillingDocumentsQueryDto } from './dto/list-shop-billing-documents-query.dto';
import { SendBillingDocumentEmailDto } from './dto/send-billing-document-email.dto';
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
    private readonly resendService: ResendService,
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

  async sendEmail(
    shopId: string,
    ownerUserId: string,
    documentId: string,
    dto: SendBillingDocumentEmailDto,
  ): Promise<{ sent: boolean; recipientEmail: string }> {
    if (!this.resendService.isConfigured()) {
      throw new BadRequestException(
        'Email sending is not configured on this server. Set RESEND_API_KEY.',
      );
    }

    const shop = await this.shopsService.findOneOwnedByUser(shopId, ownerUserId);
    const row = await this.repo.findOne({
      where: { id: documentId, shopId, isDeleted: false },
    });
    if (!row) {
      throw new NotFoundException(`Billing document ${documentId} not found`);
    }

    const snapshot = row.snapshot as Record<string, unknown>;
    const customer = snapshot.customer as Record<string, unknown> | undefined;
    const recipientEmail =
      dto.recipientEmail?.trim() ||
      (typeof customer?.email === 'string' ? customer.email.trim() : '');

    if (!recipientEmail) {
      throw new BadRequestException(
        'No recipient email: provide recipientEmail in the request body or ensure the billing document has a customer email in its snapshot.',
      );
    }

    const isQuotation = row.documentType === ShopBillingDocumentType.QUOTATION;
    const docLabel = isQuotation ? 'Quotation' : 'Invoice';
    const shopName = shop.name ?? 'Your Supplier';
    const customerName =
      typeof customer?.name === 'string' ? customer.name : 'Customer';
    const grandTotal = (row.grandTotalMinor / 100).toFixed(2);
    const subject = `${docLabel} ${row.documentNumber} from ${shopName}`;

    const html = buildInvoiceEmailHtml({
      docLabel,
      documentNumber: row.documentNumber,
      shopName,
      customerName,
      grandTotal,
      currency: row.currency,
      issueDate: row.issueDate,
      dueDate: row.dueDate,
      paymentStatus: row.paymentStatus,
    });

    await this.resendService.sendInvoiceEmail({
      to: recipientEmail,
      subject,
      html,
      pdfBase64: dto.pdfBase64,
      fileName: `${docLabel}-${row.documentNumber}.pdf`,
    });

    return { sent: true, recipientEmail };
  }
}

// ── Email HTML builder ────────────────────────────────────────────────────────

interface EmailHtmlOptions {
  docLabel: string;
  documentNumber: string;
  shopName: string;
  customerName: string;
  grandTotal: string;
  currency: string;
  issueDate: string;
  dueDate: string | null;
  paymentStatus: ShopBillingPaymentStatus | null;
}

function buildInvoiceEmailHtml(opts: EmailHtmlOptions): string {
  const statusColor =
    opts.paymentStatus === ShopBillingPaymentStatus.PAID
      ? '#065f46'
      : opts.paymentStatus === ShopBillingPaymentStatus.PARTIAL
        ? '#92400e'
        : '#991b1b';
  const statusLabel =
    opts.paymentStatus === ShopBillingPaymentStatus.PAID
      ? 'PAID'
      : opts.paymentStatus === ShopBillingPaymentStatus.PARTIAL
        ? 'PARTIALLY PAID'
        : opts.paymentStatus
          ? 'UNPAID'
          : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${opts.docLabel} ${opts.documentNumber}</title>
</head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif;color:#111827;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08);">
          <!-- Header -->
          <tr>
            <td style="background:#111827;padding:24px 32px;">
              <p style="margin:0;color:#9ca3af;font-size:12px;text-transform:uppercase;letter-spacing:1px;">${opts.shopName}</p>
              <h1 style="margin:6px 0 0;color:#ffffff;font-size:22px;font-weight:800;">${opts.docLabel} #${opts.documentNumber}</h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:32px;">
              <p style="margin:0 0 24px;font-size:15px;color:#374151;">Hi <strong>${opts.customerName}</strong>,</p>
              <p style="margin:0 0 24px;font-size:15px;color:#374151;line-height:1.6;">
                Please find your ${opts.docLabel.toLowerCase()} attached as a PDF.
                ${opts.paymentStatus && opts.paymentStatus !== ShopBillingPaymentStatus.PAID
                  ? 'Kindly review the details and arrange payment at your earliest convenience.'
                  : opts.paymentStatus === ShopBillingPaymentStatus.PAID
                    ? 'This invoice has been fully paid. Thank you for your payment!'
                    : ''}
              </p>

              <!-- Summary card -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:6px;margin-bottom:28px;">
                <tr>
                  <td style="padding:20px 24px;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:.8px;padding-bottom:4px;">${opts.docLabel} Number</td>
                        <td align="right" style="font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:.8px;padding-bottom:4px;">Date</td>
                      </tr>
                      <tr>
                        <td style="font-size:16px;font-weight:700;color:#111827;">${opts.documentNumber}</td>
                        <td align="right" style="font-size:14px;color:#374151;">${opts.issueDate}</td>
                      </tr>
                      ${opts.dueDate ? `
                      <tr><td colspan="2" style="padding-top:12px;border-top:1px solid #e5e7eb;margin-top:12px;"></td></tr>
                      <tr>
                        <td style="font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:.8px;padding-bottom:4px;">Due Date</td>
                      </tr>
                      <tr>
                        <td style="font-size:14px;color:#374151;">${opts.dueDate}</td>
                      </tr>` : ''}
                      <tr><td colspan="2" style="padding-top:16px;border-top:1px solid #e5e7eb;"></td></tr>
                      <tr>
                        <td style="font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:.8px;padding-bottom:4px;">Amount</td>
                        ${statusLabel ? `<td align="right" style="font-size:11px;font-weight:700;color:${statusColor};background:#f3f4f6;border-radius:4px;padding:2px 8px;text-align:right;">${statusLabel}</td>` : '<td></td>'}
                      </tr>
                      <tr>
                        <td style="font-size:24px;font-weight:800;color:#111827;">${opts.currency} ${opts.grandTotal}</td>
                        <td></td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <p style="margin:0;font-size:13px;color:#9ca3af;line-height:1.6;">
                The full ${opts.docLabel.toLowerCase()} is attached to this email as a PDF. If you have any questions, please contact ${opts.shopName} directly.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f9fafb;padding:16px 32px;border-top:1px solid #e5e7eb;">
              <p style="margin:0;font-size:11px;color:#9ca3af;text-align:center;">
                This email was sent by ${opts.shopName} via DukaanPro.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
