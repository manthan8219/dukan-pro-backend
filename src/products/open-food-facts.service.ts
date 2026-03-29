import { Injectable, Logger } from '@nestjs/common';

export type OpenFoodFactsMapped = {
  name: string;
  description: string | null;
  category: string | null;
  imageUrl: string | null;
};

type OffProductJson = Record<string, unknown>;

@Injectable()
export class OpenFoodFactsService {
  private readonly logger = new Logger(OpenFoodFactsService.name);
  private readonly baseUrl =
    'https://world.openfoodfacts.org/api/v2/product';

  /**
   * Returns mapped product data, or null if not found / unusable.
   */
  async fetchProduct(code: string): Promise<OpenFoodFactsMapped | null> {
    const url = `${this.baseUrl}/${encodeURIComponent(code)}`;
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), 12_000);
    const userAgent =
      process.env.OPENFOODFACTS_USER_AGENT ??
      'DukaanPro/1.0 (https://github.com/manthan8219/dukan-pro)';

    try {
      const res = await fetch(url, {
        signal: ac.signal,
        headers: {
          Accept: 'application/json',
          'User-Agent': userAgent,
        },
      });
      if (!res.ok) {
        this.logger.debug(`OFF HTTP ${res.status} for ${code}`);
        return null;
      }
      const json = (await res.json()) as {
        product?: OffProductJson;
        status?: number;
      };
      const p = json.product;
      if (!p || typeof p !== 'object') {
        return null;
      }
      const name = this.pickName(p);
      if (!name) {
        return null;
      }
      return {
        name: name.slice(0, 200),
        description: this.pickDescription(p),
        category: this.pickCategory(p),
        imageUrl: this.pickImageUrl(p),
      };
    } catch (e) {
      this.logger.warn(`Open Food Facts request failed for ${code}: ${String(e)}`);
      return null;
    } finally {
      clearTimeout(timer);
    }
  }

  private pickName(p: OffProductJson): string | null {
    const candidates = [
      p.product_name_en,
      p.product_name,
      p.generic_name_en,
      p.generic_name,
      p.abbreviated_product_name_en,
      p.abbreviated_product_name,
    ];
    for (const c of candidates) {
      if (typeof c === 'string' && c.trim().length > 0) {
        return c.trim();
      }
    }
    return null;
  }

  private pickDescription(p: OffProductJson): string | null {
    const ing =
      (typeof p.ingredients_text_en === 'string' && p.ingredients_text_en) ||
      (typeof p.ingredients_text === 'string' && p.ingredients_text);
    if (ing && ing.trim()) {
      const t = ing.trim();
      return t.length > 5000 ? t.slice(0, 5000) : t;
    }
    const gen = typeof p.generic_name_en === 'string' && p.generic_name_en.trim()
      ? p.generic_name_en.trim()
      : typeof p.generic_name === 'string' && p.generic_name.trim()
        ? p.generic_name.trim()
        : null;
    return gen;
  }

  private pickCategory(p: OffProductJson): string | null {
    const cat = typeof p.categories === 'string' ? p.categories.trim() : '';
    if (cat) {
      const first = cat.split(',')[0]?.trim();
      if (first) {
        return first.slice(0, 100);
      }
    }
    const tags = p.categories_tags;
    if (Array.isArray(tags) && tags.length > 0) {
      const t0 = tags[0];
      if (typeof t0 === 'string') {
        return t0.replace(/^..:/, '').replace(/-/g, ' ').slice(0, 100);
      }
    }
    return null;
  }

  private pickImageUrl(p: OffProductJson): string | null {
    const u =
      (typeof p.image_url === 'string' && p.image_url) ||
      (typeof p.image_front_url === 'string' && p.image_front_url);
    if (!u || !u.startsWith('http')) return null;
    return u.length > 2048 ? u.slice(0, 2048) : u;
  }
}
