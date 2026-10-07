/**
 * Read-only database lookups the AI assistant may call.
 *
 * Safety rules:
 *  - The model never writes SQL; it can only call these fixed functions with validated arguments.
 *  - Personal data is scoped to the logged-in user (their own orders / wishlist) and never
 *    includes addresses, emails, phone numbers or payment details.
 *  - Results are kept small so prompts stay cheap and fast.
 */
import { prisma } from '@/lib/prisma';
import { FunctionDeclaration } from '@/lib/assistant/gemini';
import { extractPreferences, hasPreferences, matchPreferences } from '@/lib/genie/catalogSearch';
import { Cat, matchCategory, normalize } from '@/lib/genie/giftFlow';
import { getActiveDeals, subtreeIds, offerLabel } from '@/lib/genie/offers';
import { displayableAttributes } from '@/lib/utils';

export interface AssistantContext {
  user?: { userId: string; email: string; name?: string } | null;
  /** Set when the assistant is talking inside a group shopping party */
  party?: { sessionId: string; code: string } | null;
}

export interface ToolRunState {
  ctx: AssistantContext;
  categories: Cat[];
  /** Products the model chose to show as cards (validated ids, in order) */
  recommended: { productId: string; note: string }[];
}

const round2 = (n: number) => Math.round(n * 100) / 100;
const clampInt = (v: unknown, def: number, min: number, max: number) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, Math.floor(n))) : def;
};
const str = (v: unknown, max = 200) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

/** Category name (exact-ish, or shopper words like "skin care") → ids of it and its sub-categories */
function resolveCategoryIds(name: string, categories: Cat[]): string[] | null {
  if (!name) return null;
  const n = name.toLowerCase();
  const direct =
    categories.find((c) => c.name.toLowerCase() === n) ||
    categories.find((c) => c.name.toLowerCase().includes(n) || n.includes(c.name.toLowerCase()));
  const cat = direct || matchCategory(normalize(name), categories);
  return cat ? subtreeIds(categories, cat.id) : null;
}

const PRODUCT_FIELDS = {
  id: true,
  title: true,
  description: true,
  price: true,
  rating: true,
  reviewsCount: true,
  stock: true,
  attributes: true,
  isTryOnAvailable: true,
  category: { select: { name: true } },
  vendor: { select: { name: true } },
} as const;

// ---------------------------------------------------------------------------
// Declarations (what the model sees)
// ---------------------------------------------------------------------------

export const TOOL_DECLARATIONS: FunctionDeclaration[] = [
  {
    name: 'search_products',
    description:
      'Search the Shopora catalog. Use for any product question (types, colours, materials, budgets, categories, cheapest/best rated). Returns matching products with id, price, rating, seller and stock.',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'What the shopper wants in plain words, e.g. "red cotton shirt", "sunscreen", "watch for men"' },
        category: { type: 'string', description: 'Category name, e.g. "Skincare", "Clothes", "Jewellery & Fine Accessories"' },
        min_price: { type: 'number' },
        max_price: { type: 'number' },
        sort: { type: 'string', enum: ['relevance', 'price_low_to_high', 'price_high_to_low', 'rating'] },
        limit: { type: 'integer', description: 'Max results (default 6, max 10)' },
      },
    },
  },
  {
    name: 'get_product_details',
    description: 'Full details of one product: description, attributes (colour, size, material…), seller, stock, rating, try-on availability and a few recent reviews.',
    parameters: {
      type: 'object',
      properties: {
        product_id: { type: 'string' },
        name: { type: 'string', description: 'Product name, if the id is unknown' },
      },
    },
  },
  {
    name: 'list_categories',
    description: 'All store categories and sub-categories with how many products are in stock in each.',
    parameters: { type: 'object', properties: {} },
  },
  {
    name: 'find_offers',
    description: 'Offers, discounts and sales running right now, with the discounted prices of the products they cover.',
    parameters: {
      type: 'object',
      properties: { category: { type: 'string', description: 'Optional category to limit to' } },
    },
  },
  {
    name: 'get_product_reviews',
    description: 'Recent customer reviews of a product (rating, text, whether photos were attached).',
    parameters: {
      type: 'object',
      properties: { product_id: { type: 'string' }, limit: { type: 'integer' } },
      required: ['product_id'],
    },
  },
  {
    name: 'list_sellers',
    description: 'The sellers (vendors) on Shopora with their rating and number of products.',
    parameters: { type: 'object', properties: {} },
  },
  {
    name: 'get_my_orders',
    description:
      "The logged-in shopper's own recent orders with status, items and live delivery tracking per package. Use for 'where is my order', 'did my order ship', order history.",
    parameters: {
      type: 'object',
      properties: {
        order_number: { type: 'string', description: 'A specific order number like ORD-123456' },
        limit: { type: 'integer', description: 'How many recent orders (default 5)' },
      },
    },
  },
  {
    name: 'get_my_cart',
    description:
      "The logged-in shopper's own personal shopping cart: items, quantities, prices, stock, subtotal and how far they are from free shipping. (Inside a party, the shared party cart is get_party_cart.)",
    parameters: { type: 'object', properties: {} },
  },
  {
    name: 'get_my_wishlist',
    description: "Products the logged-in shopper saved to their wishlist.",
    parameters: { type: 'object', properties: {} },
  },
  {
    name: 'get_party_cart',
    description: 'The shared cart of the current group shopping party: items, who added them, total, members and checkout status. Only available inside a group party.',
    parameters: { type: 'object', properties: {} },
  },
  {
    name: 'get_party_suggestions',
    description: 'Products suggested in the current group party chat and how members voted on them. Only available inside a group party.',
    parameters: { type: 'object', properties: {} },
  },
  {
    name: 'recommend_products',
    description:
      'Show product cards to the shopper (max 4) for products you found with the other tools. Call this whenever you recommend specific products.',
    parameters: {
      type: 'object',
      properties: {
        items: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              product_id: { type: 'string' },
              note: { type: 'string', description: 'A short reason, e.g. "Comes in Crimson Red, 4.8★"' },
            },
            required: ['product_id'],
          },
        },
      },
      required: ['items'],
    },
  },
];

// ---------------------------------------------------------------------------
// Executors
// ---------------------------------------------------------------------------

type Args = Record<string, unknown>;

async function searchProducts(args: Args, state: ToolRunState) {
  const query = str(args.query);
  const categoryIds = resolveCategoryIds(str(args.category), state.categories);
  const price: { gte?: number; lte?: number } = {};
  if (typeof args.min_price === 'number') price.gte = args.min_price;
  if (typeof args.max_price === 'number') price.lte = args.max_price;

  const products = await prisma.product.findMany({
    where: {
      stock: { gt: 0 },
      ...(categoryIds ? { categoryId: { in: categoryIds } } : {}),
      ...(Object.keys(price).length ? { price } : {}),
    },
    select: PRODUCT_FIELDS,
    take: 300,
  });

  // Relevance: query words in title (strong) / description, category, attributes (weaker)
  const words = normalize(query)
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length > 2 && !['for', 'and', 'the', 'with', 'show', 'any', 'some'].includes(w));
  let ranked = products
    .map((p) => {
      const title = p.title.toLowerCase();
      const rest = `${p.description} ${p.category.name} ${JSON.stringify(displayableAttributes(p.attributes))}`.toLowerCase();
      const score = words.reduce((s, w) => s + (title.includes(w) ? 3 : rest.includes(w) ? 1 : 0), 0);
      return { p, score };
    })
    .filter((x) => words.length === 0 || x.score > 0 || !!categoryIds);

  // Colour / material / item-type words get the stricter catalog matcher
  const prefs = extractPreferences(query);
  let noteFor = new Map<string, string | null>();
  if (hasPreferences(prefs)) {
    const m = matchPreferences(ranked.map((x) => ({ ...x.p, _score: x.score })), prefs);
    const keep = m.exact.length ? m.exact : m.similar;
    noteFor = new Map(keep.map((r) => [r.product.id, r.note]));
    ranked = ranked.filter((x) => noteFor.has(x.p.id));
  }

  const sort = str(args.sort);
  ranked.sort((a, b) =>
    sort === 'price_low_to_high'
      ? a.p.price - b.p.price
      : sort === 'price_high_to_low'
        ? b.p.price - a.p.price
        : sort === 'rating'
          ? b.p.rating - a.p.rating
          : b.score - a.score || b.p.rating - a.p.rating
  );

  const limit = clampInt(args.limit, 6, 1, 10);
  return {
    total_matches: ranked.length,
    products: ranked.slice(0, limit).map(({ p }) => ({
      id: p.id,
      title: p.title,
      price: p.price,
      rating: p.rating,
      category: p.category.name,
      seller: p.vendor.name,
      in_stock: p.stock,
      ...(noteFor.get(p.id) ? { match: noteFor.get(p.id) } : {}),
    })),
  };
}

async function getProductDetails(args: Args) {
  const id = str(args.product_id, 60);
  const name = str(args.name);
  const p = await prisma.product.findFirst({
    where: id ? { id } : { title: { contains: name, mode: 'insensitive' } },
    select: {
      ...PRODUCT_FIELDS,
      reviews: { select: { rating: true, comment: true, createdAt: true }, orderBy: { createdAt: 'desc' }, take: 3 },
    },
  });
  if (!p) return { error: 'Product not found' };
  return {
    id: p.id,
    title: p.title,
    description: p.description.slice(0, 500),
    price: p.price,
    rating: p.rating,
    reviews_count: p.reviewsCount,
    in_stock: p.stock,
    category: p.category.name,
    seller: p.vendor.name,
    attributes: Object.fromEntries(displayableAttributes(p.attributes)),
    virtual_try_on: p.isTryOnAvailable,
    recent_reviews: p.reviews.map((r) => ({ rating: r.rating, comment: r.comment.slice(0, 200) })),
  };
}

async function listCategories(state: ToolRunState) {
  const counts = await prisma.product.groupBy({ by: ['categoryId'], where: { stock: { gt: 0 } }, _count: true });
  const countOf = (ids: string[]) => counts.filter((c) => ids.includes(c.categoryId)).reduce((s, c) => s + c._count, 0);
  const cats = state.categories;
  return {
    categories: cats
      .filter((c) => !c.parentId)
      .map((root) => ({
        name: root.name,
        products_in_stock: countOf(subtreeIds(cats, root.id)),
        sub_categories: cats.filter((c) => c.parentId === root.id).map((c) => ({ name: c.name, products_in_stock: countOf(subtreeIds(cats, c.id)) })),
      })),
  };
}

async function findOffers(args: Args, state: ToolRunState) {
  const categoryIds = resolveCategoryIds(str(args.category), state.categories) || undefined;
  const { offers, deals } = await getActiveDeals(prisma, state.categories, categoryIds);
  return {
    active_offers: offers.slice(0, 10).map((o) => ({
      title: o.title,
      discount: offerLabel(o.discountType, o.discountValue),
      applies_to: o.scope === 'CATEGORY' ? `category ${o.categoryName}` : o.scope === 'SPECIFIC_PRODUCTS' ? 'selected products' : `all products from ${o.vendor.name}`,
      seller: o.vendor.name,
      ends: o.endDate.toISOString().slice(0, 10),
    })),
    discounted_products: deals.slice(0, 8).map((d) => ({
      id: d.product.id,
      title: d.product.title,
      original_price: d.product.price,
      discounted_price: round2(d.finalPrice),
      offer: d.offer.title,
    })),
    note: 'Offers are informational: they are not yet applied automatically at checkout.',
  };
}

async function getProductReviews(args: Args) {
  const productId = str(args.product_id, 60);
  const reviews = await prisma.review.findMany({
    where: { productId },
    select: { rating: true, comment: true, createdAt: true, images: true },
    orderBy: { createdAt: 'desc' },
    take: clampInt(args.limit, 5, 1, 10),
  });
  return {
    reviews: reviews.map((r) => ({
      rating: r.rating,
      comment: r.comment.slice(0, 300),
      date: r.createdAt.toISOString().slice(0, 10),
      has_photos: r.images.length > 0,
    })),
  };
}

async function listSellers() {
  const vendors = await prisma.vendor.findMany({
    select: { name: true, rating: true, warehouseLocation: true, _count: { select: { products: true } } },
    orderBy: { rating: 'desc' },
    take: 30,
  });
  return { sellers: vendors.map((v) => ({ name: v.name, rating: v.rating, location: v.warehouseLocation, products: v._count.products })) };
}

async function getMyOrders(args: Args, state: ToolRunState) {
  const user = state.ctx.user;
  if (!user) return { error: 'The shopper is not logged in. Ask them to sign in to see their orders.' };
  const orderNumber = str(args.order_number, 40).toUpperCase();
  const orders = await prisma.order.findMany({
    where: {
      OR: [{ userId: user.userId }, { customerEmail: { equals: user.email, mode: 'insensitive' } }],
      ...(orderNumber ? { orderNumber } : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: clampInt(args.limit, 5, 1, 10),
    select: {
      orderNumber: true,
      createdAt: true,
      totalAmount: true,
      paymentMethod: true,
      paymentStatus: true,
      aggregateStatus: true,
      subOrders: {
        select: {
          status: true,
          expectedDelivery: true,
          vendor: { select: { name: true } },
          items: { select: { quantity: true, product: { select: { title: true } } } },
          shipments: {
            where: { status: { not: 'CANCELLED' } },
            orderBy: { createdAt: 'desc' },
            take: 1,
            select: {
              status: true,
              provider: true,
              trackingEvents: { orderBy: { eventTime: 'desc' }, take: 1, select: { description: true, eventTime: true } },
            },
          },
        },
      },
    },
  });
  if (!orders.length) return { orders: [], note: orderNumber ? `No order ${orderNumber} found for this shopper.` : 'This shopper has no orders yet.' };
  return {
    orders: orders.map((o) => ({
      order_number: o.orderNumber,
      placed_on: o.createdAt.toISOString().slice(0, 10),
      total: o.totalAmount,
      payment: `${o.paymentMethod} (${o.paymentStatus})`,
      status: o.aggregateStatus,
      packages: o.subOrders.map((s) => ({
        seller: s.vendor.name,
        status: s.status,
        expected_delivery: s.expectedDelivery?.slice(0, 10) || null,
        items: s.items.map((i) => `${i.quantity}× ${i.product.title}`),
        tracking: s.shipments[0]
          ? {
              shipment_status: s.shipments[0].status,
              delivered_by: s.shipments[0].provider === 'self' ? 'the seller personally' : 'courier',
              latest_update: s.shipments[0].trackingEvents[0]?.description || null,
            }
          : null,
      })),
    })),
  };
}

const FREE_SHIPPING_THRESHOLD = 200;

async function getMyCart(state: ToolRunState) {
  const user = state.ctx.user;
  if (!user) return { error: 'The shopper is not logged in. Ask them to sign in to see their cart.' };
  const items = await prisma.cartItem.findMany({
    where: { userId: user.userId },
    orderBy: { createdAt: 'asc' },
    select: {
      quantity: true,
      product: { select: { id: true, title: true, price: true, stock: true, vendor: { select: { name: true } } } },
    },
  });
  if (!items.length) return { items: [], note: "The shopper's cart is empty." };
  const subtotal = round2(items.reduce((sum, i) => sum + i.product.price * i.quantity, 0));
  return {
    items: items.map((i) => ({
      id: i.product.id,
      title: i.product.title,
      price: i.product.price,
      quantity: i.quantity,
      line_total: round2(i.product.price * i.quantity),
      seller: i.product.vendor.name,
      stock: i.product.stock > 0 ? (i.product.stock < i.quantity ? `only ${i.product.stock} left` : 'in stock') : 'out of stock',
    })),
    item_count: items.reduce((n, i) => n + i.quantity, 0),
    subtotal,
    free_shipping:
      subtotal >= FREE_SHIPPING_THRESHOLD
        ? 'unlocked'
        : `add $${round2(FREE_SHIPPING_THRESHOLD - subtotal)} more for free express shipping`,
  };
}

async function getMyWishlist(state: ToolRunState) {
  const user = state.ctx.user;
  if (!user) return { error: 'The shopper is not logged in. Ask them to sign in to see their wishlist.' };
  const items = await prisma.wishlistItem.findMany({
    where: { userId: user.userId },
    select: { product: { select: { id: true, title: true, price: true, stock: true } } },
    take: 20,
  });
  return { wishlist: items.map((i) => ({ id: i.product.id, title: i.product.title, price: i.product.price, in_stock: i.product.stock > 0 })) };
}

async function getPartyCart(state: ToolRunState) {
  const party = state.ctx.party;
  if (!party) return { error: 'Not in a group shopping party.' };
  const s = await prisma.groupShoppingSession.findUnique({
    where: { id: party.sessionId },
    select: {
      title: true,
      status: true,
      checkoutMode: true,
      splitMethod: true,
      members: { select: { guestName: true, role: true, status: true, guestEmail: true, user: { select: { name: true } } } },
      items: { select: { quantity: true, product: { select: { id: true, title: true, price: true } }, addedBy: { select: { guestName: true } } } },
    },
  });
  if (!s) return { error: 'Party not found.' };
  return {
    party: s.title,
    status: s.status,
    checkout: s.status === 'WAITING_FOR_PAYMENTS' ? `in progress (${s.checkoutMode}${s.splitMethod ? `, ${s.splitMethod}` : ''})` : 'not started',
    members: s.members
      .filter((m) => m.guestEmail !== 'genie@shopora.ai')
      .map((m) => `${m.user?.name || m.guestName}${m.role === 'HOST' ? ' (host)' : ''}${m.status === 'INVITED' ? ' (invited)' : ''}`),
    items: s.items.map((i) => ({ id: i.product.id, title: i.product.title, price: i.product.price, quantity: i.quantity, added_by: i.addedBy.guestName })),
    total: round2(s.items.reduce((sum, i) => sum + i.product.price * i.quantity, 0)),
  };
}

async function getPartySuggestions(state: ToolRunState) {
  const party = state.ctx.party;
  if (!party) return { error: 'Not in a group shopping party.' };
  const msgs = await prisma.groupChatMessage.findMany({
    where: { sessionId: party.sessionId, type: 'PRODUCT_SUGGESTION', productId: { not: null } },
    orderBy: { createdAt: 'desc' },
    take: 15,
    select: { votes: true, sender: { select: { guestName: true } }, product: { select: { id: true, title: true, price: true } } },
  });
  return {
    suggestions: msgs
      .filter((m) => m.product)
      .map((m) => {
        const votes = Object.values((m.votes as Record<string, string>) || {});
        const count = (...v: string[]) => votes.filter((x) => v.includes(x)).length;
        return {
          id: m.product!.id,
          title: m.product!.title,
          price: m.product!.price,
          suggested_by: m.sender.guestName,
          votes: { buy: count('BUY', 'YES', 'LOVE'), maybe: count('MAYBE'), pass: count('PASS', 'NO') },
        };
      }),
  };
}

async function recommendProducts(args: Args, state: ToolRunState) {
  const items = Array.isArray(args.items) ? (args.items as Args[]).slice(0, 4) : [];
  const ids = items.map((i) => str(i.product_id, 60)).filter(Boolean);
  const found = await prisma.product.findMany({ where: { id: { in: ids } }, select: { id: true } });
  const valid = new Set(found.map((f) => f.id));
  for (const i of items) {
    const id = str(i.product_id, 60);
    if (valid.has(id) && !state.recommended.some((r) => r.productId === id) && state.recommended.length < 4) {
      state.recommended.push({ productId: id, note: str(i.note, 120) });
    }
  }
  return { shown: state.recommended.length, ignored_unknown_ids: ids.filter((id) => !valid.has(id)) };
}

export async function runTool(name: string, args: Args, state: ToolRunState): Promise<Record<string, unknown>> {
  switch (name) {
    case 'search_products':
      return searchProducts(args, state);
    case 'get_product_details':
      return getProductDetails(args);
    case 'list_categories':
      return listCategories(state);
    case 'find_offers':
      return findOffers(args, state);
    case 'get_product_reviews':
      return getProductReviews(args);
    case 'list_sellers':
      return listSellers();
    case 'get_my_orders':
      return getMyOrders(args, state);
    case 'get_my_cart':
      return getMyCart(state);
    case 'get_my_wishlist':
      return getMyWishlist(state);
    case 'get_party_cart':
      return getPartyCart(state);
    case 'get_party_suggestions':
      return getPartySuggestions(state);
    case 'recommend_products':
      return recommendProducts(args, state);
    default:
      return { error: `Unknown tool ${name}` };
  }
}
