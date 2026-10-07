/**
 * Shopping assistant — "are there any offers / discounts / sales?"
 * Looks up vendor offers that are running right now (startDate ≤ now ≤ endDate), resolves
 * which in-stock products they cover, and replies with the best deals.
 */
import { PrismaClient } from '@prisma/client';
import { Cat, GenieReply, matchCategory, normalize, pick, pills, money } from '@/lib/genie/giftFlow';

const OFFER_INTENT =
  /\b(offers?|discounts?|discounted|deals?|sales?|on sale|promo(tion)?s?|coupons?|vouchers?|cashback|price drops?|% off|percent off)\b/;

export const isOfferQuestion = (prompt: string) => OFFER_INTENT.test(normalize(prompt));

export function subtreeIds(cats: Cat[], rootId: string): string[] {
  const out = [rootId];
  for (let i = 0; i < out.length; i++) for (const c of cats) if (c.parentId === out[i]) out.push(c.id);
  return out;
}

const discounted = (price: number, type: string, value: number) =>
  Math.max(0, type === 'PERCENTAGE' ? price * (1 - value / 100) : price - value);

export const offerLabel = (type: string, value: number) =>
  type === 'PERCENTAGE' ? `${value}% off` : `${money(value)} off`;

const endsOn = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

export interface ActiveDeal {
  product: { id: string; title: string; price: number; rating: number };
  offer: {
    id: string;
    title: string;
    discountType: string;
    discountValue: number;
    scope: string;
    categoryName: string | null;
    endDate: Date;
    vendor: { id: string; name: string };
  };
  finalPrice: number;
}

/**
 * Offers running right now and the in-stock products they cover (best deal per product,
 * biggest saving first). `categoryIds` optionally limits results to those categories.
 */
export async function getActiveDeals(prisma: PrismaClient, categories: Cat[], categoryIds?: string[]) {
  const now = new Date();
  const offers = await prisma.offer.findMany({
    where: { startDate: { lte: now }, endDate: { gte: now } },
    include: { vendor: { select: { id: true, name: true } } },
    orderBy: { endDate: 'asc' },
  });

  const best = new Map<string, ActiveDeal>();
  for (const offer of offers) {
    const where: Record<string, unknown> = { vendorId: offer.vendorId, stock: { gt: 0 } };
    let ids: string[] | null = null;
    if (offer.scope === 'CATEGORY' && offer.categoryId) ids = subtreeIds(categories, offer.categoryId);
    if (categoryIds) ids = ids ? ids.filter((id) => categoryIds.includes(id)) : categoryIds;
    if (ids) where.categoryId = { in: ids };
    if (offer.scope === 'SPECIFIC_PRODUCTS') where.id = { in: offer.productIds };
    const products = await prisma.product.findMany({ where, select: { id: true, title: true, price: true, rating: true } });
    for (const product of products) {
      const finalPrice = discounted(product.price, offer.discountType, offer.discountValue);
      const current = best.get(product.id);
      if (!current || finalPrice < current.finalPrice) best.set(product.id, { product, offer, finalPrice });
    }
  }
  const deals = Array.from(best.values()).sort(
    (a, b) => b.product.price - b.finalPrice - (a.product.price - a.finalPrice) || b.product.rating - a.product.rating
  );
  return { offers, deals };
}

export async function runOfferQuery(opts: {
  prisma: PrismaClient;
  prompt: string;
  categories: Cat[];
}): Promise<GenieReply[]> {
  const { prisma, categories } = opts;
  const category = matchCategory(normalize(opts.prompt), categories);
  const { offers, deals } = await getActiveDeals(prisma, categories, category ? subtreeIds(categories, category.id) : undefined);

  const where = category ? ` on ${category.name}` : '';

  if (deals.length === 0) {
    return [
      {
        content:
          (offers.length === 0
            ? `I checked — there aren't any offers or discounts running${where} right now 😕`
            : `There are offers running at the moment, but none${where} on products that are in stock right now 😕`) +
          ` Keep an eye out, sellers add new deals often! Meanwhile, want me to find something within your budget?` +
          pills(['💸 Cheapest picks', '🎁 Help me find a gift', '🌸 Skincare', '👗 Clothes']),
      },
    ];
  }

  const offerLines = Array.from(new Set(deals.map((d) => d.offer.id)))
    .map((id) => offers.find((o) => o.id === id)!)
    .slice(0, 5)
    .map((o) => {
      const scope =
        o.scope === 'CATEGORY' ? ` on ${o.categoryName || 'a category'}` : o.scope === 'SPECIFIC_PRODUCTS' ? ' on selected items' : ' storewide';
      return `• 🏷️ ${o.title} — ${offerLabel(o.discountType, o.discountValue)}${scope} from ${o.vendor.name} (ends ${endsOn(o.endDate)})`;
    })
    .join('\n');

  const lead =
    pick([`Yes! There are deals running${where} right now 🎉`, `Good news — I found some discounts${where} 🛍️`]) +
    `\n\n${offerLines}\n\nHere are the best savings I found${deals.length > 3 ? ` (${deals.length} products in total)` : ''}:`;

  return [
    { content: lead },
    ...deals.slice(0, 3).map(({ product, offer, finalPrice }, i) => ({
      productId: product.id,
      content: `${i === 0 ? '🔥 Best deal' : '🏷️ Also on offer'} — ${offerLabel(offer.discountType, offer.discountValue)}: ${money(
        Math.round(finalPrice * 100) / 100
      )} (was ${money(product.price)}) · ends ${endsOn(offer.endDate)}`,
    })),
  ];
}
