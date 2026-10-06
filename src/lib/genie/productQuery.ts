/**
 * Shopora Genie — direct product questions outside the gift finder
 * ("do you have red shirts?", "cotton tops under $50", "cheapest sunscreen").
 * Searches the real catalog and answers honestly, including when nothing matches.
 */
import { PrismaClient } from '@prisma/client';
import {
  CatalogProduct,
  RankedProduct,
  extractPreferences,
  hasPreferences,
  describePreferences,
  matchPreferences,
} from '@/lib/genie/catalogSearch';
import {
  Cat,
  GenieReply,
  normalize,
  parseBudget,
  parseGender,
  budgetPhrase,
  matchCategory,
  idsForRecipient,
  priceFilter,
  pick,
  MALE_PRODUCT,
  FEMALE_PRODUCT,
} from '@/lib/genie/giftFlow';

export async function runProductSearch(opts: {
  prisma: PrismaClient;
  prompt: string;
  categories: Cat[];
}): Promise<{ handled: boolean; replies: GenieReply[] }> {
  const { prisma, categories } = opts;
  const text = normalize(opts.prompt);

  const prefs = extractPreferences(text);
  const category = matchCategory(text, categories);
  const parsedBudget = parseBudget(text, false);
  const budget = parsedBudget && parsedBudget !== 'any' ? parsedBudget : null;
  const gender = /\b(for (her|him|women|men|a woman|a man|girls?|boys?|ladies|gents)|women'?s|men'?s|ladies)\b/.test(text)
    ? parseGender(text, false)
    : null;
  const sort = /\b(cheap\w*|lowest price|least expensive|affordable)\b/.test(text)
    ? 'price_asc'
    : /\b(most expensive|highest price|luxury|premium|costliest)\b/.test(text)
      ? 'price_desc'
      : null;

  // Nothing product-specific to search for — let the general Genie handling reply
  if (!category && !hasPreferences(prefs) && !budget && !sort) return { handled: false, replies: [] };

  const ids = category ? idsForRecipient(categories, category.id, gender) : null;
  const products: CatalogProduct[] = ids && ids.length === 0
    ? []
    : await prisma.product.findMany({
        where: { stock: { gt: 0 }, ...(ids ? { categoryId: { in: ids } } : {}), ...priceFilter(budget) },
        select: {
          id: true,
          title: true,
          description: true,
          price: true,
          rating: true,
          attributes: true,
          category: { select: { name: true } },
        },
      });

  const ranked = products
    .filter((p) => {
      const t = `${p.title} ${p.description}`;
      return !(gender === 'female' && MALE_PRODUCT.test(t)) && !(gender === 'male' && FEMALE_PRODUCT.test(t));
    })
    .sort((a, b) =>
      sort === 'price_asc' ? a.price - b.price : sort === 'price_desc' ? b.price - a.price : b.rating - a.rating || b.price - a.price
    );

  const noun = category ? category.name.toLowerCase() : 'products';
  const asked = hasPreferences(prefs) ? describePreferences(prefs, noun) : noun;
  const price = budgetPhrase(budget);
  const where = `${asked}${price ? ` ${price}` : ''}`;

  let picks: RankedProduct[] = [];
  let lead: string;
  if (hasPreferences(prefs)) {
    const m = matchPreferences(ranked, prefs);
    if (m.exact.length) {
      picks = m.exact.slice(0, 3);
      lead =
        sort === 'price_asc'
          ? `Here are the most affordable ${where} I could find 💸`
          : sort === 'price_desc'
            ? `Here are our most premium ${where} ✨`
            : pick([`Yes! We do have ${where} — here's what I found 🎉`, `Good news — we've got ${where}! 😍`]);
    } else if (m.similar.length) {
      picks = m.similar.slice(0, 3);
      lead = `Hmm, I searched everywhere but couldn't find any ${where} right now 😕 The closest I have is ${m.similarColor} — would one of these work?`;
    } else {
      // Show what we do have in the category, if anything, so the answer isn't a dead end
      picks = category ? ranked.slice(0, 3).map((product) => ({ product, note: null })) : [];
      lead = picks.length
        ? `I searched our whole catalog but couldn't find any ${where} right now 😕 Here are some other ${noun} you might like instead 👇`
        : `I searched our whole catalog but couldn't find any ${where} right now 😕 Want me to look for something else?`;
    }
  } else {
    picks = ranked.slice(0, 3).map((product) => ({ product, note: null }));
    lead = picks.length
      ? sort === 'price_asc'
        ? `Here are the most affordable ${where} I could find 💸`
        : sort === 'price_desc'
          ? `Here are our most premium ${where} ✨`
          : pick([`Here are my favourite ${where} 😊`, `Ooh, I've got some lovely ${where} for you ✨`])
      : `Sorry, I couldn't find any ${where} in stock right now 😕 Want me to look for something else?`;
  }

  return {
    handled: true,
    replies: [
      {
        content:
          lead +
          (picks.length > 1 ? ` Vote on them so the whole group can weigh in 🗳️` : '') +
          `\n\n[ 🎁 Help me find a gift ]`,
      },
      ...picks.map(({ product, note }, i) => ({
        productId: product.id,
        content: `${i === 0 ? '🏆 Top pick' : '💡 Also lovely'} — ⭐ ${product.rating.toFixed(1)}${note ? ` · ${note}` : ''}`,
      })),
    ],
  };
}
