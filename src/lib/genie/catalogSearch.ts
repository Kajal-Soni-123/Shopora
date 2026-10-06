/**
 * Shopora Genie — preference-aware catalog matching.
 *
 * Understands what a shopper says about the product itself ("red", "cotton", "a watch")
 * and checks it against the real catalog: title, description, category name and the
 * product's attributes (e.g. attributes.color = ["Black", "Crimson Red"]). Results are
 * split into exact matches and near matches (a neighbouring colour) so Genie can answer
 * honestly — "yes, here it is" vs "not in red, but the closest is pink".
 */

export interface Preferences {
  colors: string[]; // canonical colour families, e.g. ['red']
  materials: string[]; // canonical materials, e.g. ['cotton']
  items: string[]; // product types, e.g. ['shirt']
  words?: string[]; // the shopper's own colour/material words ("emerald", "rose gold") for replies
}

export interface CatalogProduct {
  id: string;
  title: string;
  description: string;
  price: number;
  rating: number;
  attributes: unknown;
  category: { name: string };
}

export interface RankedProduct<P extends CatalogProduct = CatalogProduct> {
  product: P;
  note: string | null; // e.g. "Comes in Crimson Red"
}

export interface PreferenceMatch<P extends CatalogProduct = CatalogProduct> {
  exact: RankedProduct<P>[];
  similar: RankedProduct<P>[];
  similarColor: string | null;
}

const COLOR_FAMILIES: Record<string, string[]> = {
  red: ['red', 'crimson', 'scarlet', 'maroon', 'ruby', 'burgundy', 'cherry', 'wine'],
  pink: ['pink', 'rose', 'rosy', 'rosey', 'blush', 'fuchsia', 'magenta'],
  orange: ['orange', 'coral', 'peach', 'rust', 'tangerine'],
  yellow: ['yellow', 'mustard', 'lemon'],
  green: ['green', 'emerald', 'olive', 'mint', 'sage', 'teal'],
  blue: ['blue', 'navy', 'indigo', 'sapphire', 'cobalt', 'azure', 'sky'],
  purple: ['purple', 'violet', 'lavender', 'plum', 'lilac', 'mauve'],
  brown: ['brown', 'tan', 'beige', 'chocolate', 'camel', 'khaki'],
  black: ['black', 'obsidian', 'charcoal', 'jet'],
  white: ['white', 'ivory', 'off-white', 'pearl'],
  grey: ['grey', 'gray', 'slate'],
};

/** Closest colour families to suggest when the exact colour isn't in stock */
const COLOR_NEIGHBOURS: Record<string, string[]> = {
  red: ['pink', 'orange', 'purple'],
  pink: ['red', 'purple'],
  orange: ['red', 'yellow'],
  yellow: ['orange', 'green'],
  green: ['blue', 'yellow'],
  blue: ['purple', 'green'],
  purple: ['pink', 'blue'],
  brown: ['orange', 'black'],
  black: ['grey', 'brown'],
  white: ['grey'],
  grey: ['black', 'white'],
};

const MATERIALS: Record<string, string[]> = {
  cotton: ['cotton'],
  linen: ['linen'],
  silk: ['silk'],
  velvet: ['velvet'],
  denim: ['denim'],
  rayon: ['rayon'],
  wool: ['wool', 'woollen', 'woolen'],
  leather: ['leather'],
  rosegold: ['rosegold'],
  gold: ['gold'],
  silver: ['silver'],
  platinum: ['platinum'],
  diamond: ['diamond', 'diamonds'],
  wood: ['wood', 'wooden', 'teak', 'oak'],
};

const ITEMS: Record<string, RegExp> = {
  shirt: /\bshirts?\b/,
  top: /\b(tops?|tank ?tops?|tanks?)\b/,
  dress: /\bdress(es)?\b/,
  watch: /\bwatch(es)?\b/,
  necklace: /\b(necklaces?|pendants?)\b/,
  earring: /\b(earrings?|earings?)\b/,
  bracelet: /\b(bracelets?|braclets?|bangles?)\b/,
  ring: /\brings?\b/,
  sunscreen: /\b(sunscreens?|suncreens?|spf)\b/,
  serum: /\bserums?\b/,
  moisturiser: /\b(moisturi[sz]ers?|moisture cream)\b/,
  sofa: /\b(sofas?|couch)\b/,
  chair: /\b(chairs?|armchairs?)\b/,
  table: /\btables?\b/,
  purifier: /\bpurifiers?\b/,
  vacuum: /\bvacuums?\b/,
  coffee: /\b(espresso|coffee machine|coffee maker)\b/,
};

const ITEM_LABELS: Record<string, string> = {
  shirt: 'shirts', top: 'tops', dress: 'dresses', watch: 'watches', necklace: 'necklaces',
  earring: 'earrings', bracelet: 'bracelets', ring: 'rings', sunscreen: 'sunscreens',
  serum: 'serums', moisturiser: 'moisturisers', sofa: 'sofas', chair: 'chairs', table: 'tables',
  purifier: 'air purifiers', vacuum: 'vacuums', coffee: 'coffee machines',
};

const wordRe = (words: string[]) => new RegExp(`\\b(${words.map((w) => w.replace(/[-]/g, '\\-')).join('|')})\\b`, 'i');

export function extractPreferences(text: string): Preferences {
  const t = text
    .toLowerCase()
    .replace(/rose ?gold/g, 'rosegold')
    .replace(/\btop[- ](rated|pick|picks|quality|seller|selling|brands?)\b/g, ' ');
  const colors = Object.keys(COLOR_FAMILIES).filter((c) => wordRe(COLOR_FAMILIES[c]).test(t));
  const materials = Object.keys(MATERIALS).filter((m) => wordRe(MATERIALS[m]).test(t));
  const words = [...colors.map((c) => COLOR_FAMILIES[c]), ...materials.map((m) => MATERIALS[m])]
    .map((syn) => t.match(wordRe(syn))?.[1])
    .filter((w): w is string => !!w)
    .map((w) => (w === 'rosegold' ? 'rose gold' : w));
  return { colors, materials, items: Object.keys(ITEMS).filter((i) => ITEMS[i].test(t)), words };
}

export const hasPreferences = (p?: Preferences | null): p is Preferences =>
  !!p && p.colors.length + p.materials.length + p.items.length > 0;

/** "red", "red cotton", "red shirts" — what the shopper asked for, in their words */
export function describePreferences(p: Preferences, fallbackNoun: string): string {
  const noun = p.items.length ? p.items.map((i) => ITEM_LABELS[i]).join(' or ') : fallbackNoun;
  const adjectives = p.words?.length ? p.words.join(' ') : [...p.colors, ...p.materials].join(' ');
  return [adjectives, noun].filter(Boolean).join(' ');
}

/**
 * Searchable text for a product: title, category and attribute values (images skipped).
 * Descriptions are included for colour/material (`full`), but not for item type — a serum
 * whose description says "use before SPF" is not a sunscreen.
 */
function productText(p: CatalogProduct, full = true): string {
  const attrs: string[] = [];
  const walk = (key: string, v: unknown) => {
    if (/image|img|photo|url/i.test(key)) return;
    if (!full && /description/i.test(key)) return;
    if (typeof v === 'string' && v.length <= 200) attrs.push(v);
    else if (typeof v === 'number') attrs.push(String(v));
    else if (Array.isArray(v)) v.forEach((x) => walk(key, x));
    else if (v && typeof v === 'object') Object.entries(v).forEach(([k, x]) => walk(k, x));
  };
  walk('', p.attributes);
  return `${p.title} ${full ? p.description : ''} ${p.category.name} ${attrs.join(' ')}`
    .toLowerCase()
    .replace(/rose ?gold/g, 'rosegold');
}

/** The product's own colour wording for a family, e.g. "Crimson Red" from attributes.color */
function colorNote(p: CatalogProduct, family: string): string | null {
  const attrs = (p.attributes && typeof p.attributes === 'object' ? (p.attributes as Record<string, unknown>) : {}) || {};
  const raw = attrs.color ?? attrs.colour;
  const options = (Array.isArray(raw) ? raw : raw != null ? [raw] : []).map(String);
  const re = wordRe(COLOR_FAMILIES[family]);
  const hit = options.find((o) => re.test(o.toLowerCase()));
  if (hit) return options.length > 1 ? `Available in ${hit}` : `Comes in ${hit}`;
  return null;
}

function matches(p: CatalogProduct, prefs: Preferences, colors: string[]) {
  const text = productText(p);
  const itemText = productText(p, false);
  const itemOk = prefs.items.length === 0 || prefs.items.some((i) => ITEMS[i].test(itemText));
  const materialOk = prefs.materials.length === 0 || prefs.materials.some((m) => wordRe(MATERIALS[m]).test(text));
  const color = colors.length === 0 ? null : colors.find((c) => wordRe(COLOR_FAMILIES[c]).test(text)) || undefined;
  return { ok: itemOk && materialOk && color !== undefined, color };
}

/**
 * Split products into exact preference matches and neighbouring-colour matches.
 * Input order is preserved, so sort the products (rating, price…) before calling.
 */
export function matchPreferences<P extends CatalogProduct>(products: P[], prefs: Preferences): PreferenceMatch<P> {
  const exact: RankedProduct<P>[] = [];
  for (const p of products) {
    const m = matches(p, prefs, prefs.colors);
    if (m.ok) exact.push({ product: p, note: m.color ? colorNote(p, m.color) : null });
  }
  if (exact.length > 0 || prefs.colors.length === 0) return { exact, similar: [], similarColor: null };

  const neighbours = Array.from(new Set(prefs.colors.flatMap((c) => COLOR_NEIGHBOURS[c] || []))).filter(
    (c) => !prefs.colors.includes(c)
  );
  for (const family of neighbours) {
    const similar: RankedProduct<P>[] = [];
    for (const p of products) {
      const m = matches(p, prefs, [family]);
      if (m.ok) similar.push({ product: p, note: colorNote(p, family) });
    }
    if (similar.length > 0) return { exact, similar, similarColor: family };
  }
  return { exact, similar: [], similarColor: null };
}
