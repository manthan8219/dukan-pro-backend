/** Minimal CSV parser: commas, quoted fields, CRLF (matches seller inventory UI). */
export function parseCsvRows(text: string): string[][] {
  const rows: string[][] = [];
  let field = '';
  let row: string[] = [];
  let i = 0;
  let inQuotes = false;
  while (i < text.length) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i += 1;
        continue;
      }
      field += c;
      i += 1;
      continue;
    }
    if (c === '"') {
      inQuotes = true;
      i += 1;
      continue;
    }
    if (c === ',') {
      row.push(field.trim());
      field = '';
      i += 1;
      continue;
    }
    if (c === '\r') {
      i += 1;
      continue;
    }
    if (c === '\n') {
      row.push(field.trim());
      field = '';
      if (row.some((cell) => cell.length > 0)) {
        rows.push(row);
      }
      row = [];
      i += 1;
      continue;
    }
    field += c;
    i += 1;
  }
  row.push(field.trim());
  if (row.some((cell) => cell.length > 0)) {
    rows.push(row);
  }
  return rows;
}

function normalizeHeader(h: string): string {
  return h.trim().toLowerCase().replace(/\s+/g, '_');
}

export function pickColumnIndex(
  headers: string[],
  candidates: string[],
): number {
  const norm = headers.map(normalizeHeader);
  for (const want of candidates) {
    const w = want.toLowerCase();
    const idx = norm.findIndex(
      (h) => h === w || h.replace(/_/g, '') === w.replace(/_/g, ''),
    );
    if (idx >= 0) return idx;
  }
  for (const want of candidates) {
    const w = want.toLowerCase();
    const idx = norm.findIndex((h) => h.includes(w) || w.includes(h));
    if (idx >= 0) return idx;
  }
  return -1;
}

/** Rupees string → paise; min ₹0.01, max backend cap */
export function rupeesToMinor(input: string): number | null {
  const t = input.trim().replace(/,/g, '');
  if (t === '') return null;
  const n = Number(t);
  if (!Number.isFinite(n) || n < 0) return null;
  const minor = Math.round(n * 100 + Number.EPSILON);
  if (minor < 1 || minor > 2_000_000_000) return null;
  return minor;
}

export function parseIntQuantity(raw: string): number | null {
  const t = raw.trim().replace(/,/g, '');
  if (t === '') return null;
  const qty = Number(t);
  if (!Number.isFinite(qty) || qty < 0 || !Number.isInteger(qty)) return null;
  return qty;
}

export function parsePriceMinorCell(
  raw: string,
  mode: 'rupees' | 'paise',
): number | null {
  const t = raw.trim().replace(/,/g, '');
  if (t === '') return null;
  if (mode === 'rupees') {
    return rupeesToMinor(t);
  }
  const n = Number(t);
  if (
    !Number.isFinite(n) ||
    !Number.isInteger(n) ||
    n < 1 ||
    n > 2_000_000_000
  ) {
    return null;
  }
  return n;
}

export type ParsedInventoryCsvRow = {
  /** 1-based data row index (excluding header) */
  rowNumber: number;
  name: string;
  quantity: number;
  priceMinor: number;
  category: string | null;
  unit: string | null;
  listingNotes: string | null;
};

export type ParseInventoryCsvFailure = { error: string };

export type ParseInventoryCsvSuccess = {
  rows: ParsedInventoryCsvRow[];
  parseWarnings: { rowNumber: number; message: string }[];
};

/**
 * Parses UTF-8 inventory CSV like the seller UI: header row, then name + quantity + price.
 * Price column: rupees (price, mrp, …) or paise (price_minor). If no price column, uses defaultMinor when set.
 */
export function parseInventoryCsv(
  text: string,
  defaultPriceMinor: number | null,
): ParseInventoryCsvSuccess | ParseInventoryCsvFailure {
  const rows = parseCsvRows(text);
  if (rows.length === 0) {
    return { error: 'No rows found in CSV.' };
  }
  const headers = rows[0].map((c) => c.trim());
  const nameIdx = pickColumnIndex(headers, [
    'name',
    'product',
    'product_name',
    'title',
    'item',
  ]);
  const qtyIdx = pickColumnIndex(headers, [
    'quantity',
    'qty',
    'stock',
    'count',
    'units',
  ]);
  if (nameIdx < 0 || qtyIdx < 0) {
    return {
      error:
        'Need a header row with name and quantity columns (e.g. name,quantity or product_name,qty).',
    };
  }

  const priceMinorIdx = pickColumnIndex(headers, [
    'price_minor',
    'price_paise',
    'paise',
  ]);
  const priceRupeesIdx = pickColumnIndex(headers, [
    'price',
    'price_inr',
    'mrp',
    'selling_price',
    'rate',
    'amount',
  ]);

  let priceMode: 'rupees' | 'paise' | 'none' = 'none';
  if (priceMinorIdx >= 0) {
    priceMode = 'paise';
  } else if (priceRupeesIdx >= 0) {
    priceMode = 'rupees';
  }

  const categoryIdx = pickColumnIndex(headers, ['category']);
  const unitIdx = pickColumnIndex(headers, ['unit', 'uom']);
  const notesIdx = pickColumnIndex(headers, [
    'notes',
    'note',
    'listing_notes',
    'description',
  ]);

  const dataRows = rows.slice(1);
  const out: ParsedInventoryCsvRow[] = [];
  const parseWarnings: { rowNumber: number; message: string }[] = [];

  for (let i = 0; i < dataRows.length; i++) {
    const cells = dataRows[i];
    const rowNumber = i + 2;
    const name = (cells[nameIdx] ?? '').trim();
    const rawQ = (cells[qtyIdx] ?? '').trim();
    const qty = parseIntQuantity(rawQ);

    if (!name) {
      parseWarnings.push({ rowNumber, message: 'Empty name — skipped.' });
      continue;
    }
    if (qty === null) {
      parseWarnings.push({
        rowNumber,
        message: `Bad quantity "${rawQ}" — skipped.`,
      });
      continue;
    }

    let priceMinor: number | null = null;
    if (priceMode === 'paise') {
      const cell = (cells[priceMinorIdx] ?? '').trim();
      priceMinor = parsePriceMinorCell(cell, 'paise');
    } else if (priceMode === 'rupees') {
      const cell = (cells[priceRupeesIdx] ?? '').trim();
      priceMinor = parsePriceMinorCell(cell, 'rupees');
    }

    if (priceMinor === null && defaultPriceMinor !== null) {
      priceMinor = defaultPriceMinor;
    }
    if (priceMinor === null) {
      parseWarnings.push({
        rowNumber,
        message:
          'Missing or invalid price — add a price column (rupees or price_minor) or set CSV_IMPORT_DEFAULT_PRICE_RUPEES.',
      });
      continue;
    }

    const category =
      categoryIdx >= 0 ? (cells[categoryIdx] ?? '').trim() || null : null;
    const unitRaw = unitIdx >= 0 ? (cells[unitIdx] ?? '').trim() : '';
    const unit = unitRaw ? unitRaw.slice(0, 32) : null;
    const listingNotes =
      notesIdx >= 0 ? (cells[notesIdx] ?? '').trim() || null : null;

    out.push({
      rowNumber,
      name,
      quantity: qty,
      priceMinor,
      category,
      unit,
      listingNotes:
        listingNotes && listingNotes.length > 2000
          ? listingNotes.slice(0, 2000)
          : listingNotes,
    });
  }

  return { rows: out, parseWarnings };
}
