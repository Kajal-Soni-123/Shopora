/**
 * Shopora Genie — conversational gift finder.
 *
 * A small slot-filling conversation: who is it for → woman / man / child → occasion →
 * budget → category → product picks. Anything the shopper already said ("a birthday
 * gift for my mom under $100") is picked up so Genie only asks for what's missing.
 * Progress is stored per party on GroupShoppingSession.genieState, so the whole group
 * can answer. Runs without any external LLM.
 */
import { Prisma, PrismaClient } from '@prisma/client';
import {
  Preferences,
  RankedProduct,
  CatalogProduct,
  extractPreferences,
  hasPreferences,
  describePreferences,
  matchPreferences,
} from '@/lib/genie/catalogSearch';
import { ASSISTANT_MENTION } from '@/lib/assistant';

export type Gender = 'female' | 'male' | 'child' | 'any';
type Step = 'RECIPIENT' | 'GENDER' | 'OCCASION' | 'BUDGET' | 'CATEGORY' | 'RESULTS';

interface Labelled {
  key: string;
  label: string;
}

export interface Budget {
  min: number | null;
  max: number | null;
}

export interface GiftState {
  step: Step;
  recipient?: Labelled | null;
  gender?: Gender | null;
  occasion?: (Labelled & { emoji: string }) | null;
  budget?: Budget | null;
  categoryId?: string | null;
  prefs?: Preferences | null; // what they said about the product itself: colour, material, item type
  misses?: number;
  updatedAt: string;
}

export interface GenieReply {
  content: string;
  productId?: string | null;
}

export interface GiftFlowResult {
  handled: boolean;
  state: GiftState | null;
  replies: GenieReply[];
}

const STATE_TTL_MS = 30 * 60 * 1000;

// ---------------------------------------------------------------------------
// Vocabulary
// ---------------------------------------------------------------------------

const GIFT_RE = /\b(gifts?|gifting|present|presents|surprise)\b/;

const RECIPIENTS: Array<{ key: string; re: RegExp; label: string; gender: Gender | null }> = [
  { key: 'grandma', re: /\b(grandma|grandmother|granny|nani|dadi)\b/, label: 'your grandma', gender: 'female' },
  { key: 'grandpa', re: /\b(grandpa|grandfather|nana|dada)\b/, label: 'your grandpa', gender: 'male' },
  { key: 'grandparent', re: /\bgrand ?parents?\b/, label: 'your grandparent', gender: null },
  { key: 'mom', re: /\b(mom|mum|mother|mommy|mummy|mumma|maa)\b/, label: 'your mom', gender: 'female' },
  { key: 'dad', re: /\b(dad|father|daddy|papa)\b/, label: 'your dad', gender: 'male' },
  { key: 'wife', re: /\bwife\b/, label: 'your wife', gender: 'female' },
  { key: 'husband', re: /\bhusband\b/, label: 'your husband', gender: 'male' },
  { key: 'girlfriend', re: /\b(girlfriend|gf)\b/, label: 'your girlfriend', gender: 'female' },
  { key: 'boyfriend', re: /\b(boyfriend|bf)\b/, label: 'your boyfriend', gender: 'male' },
  { key: 'partner', re: /\b(partner|spouse|fiance|fiancee|better half)\b/, label: 'your partner', gender: null },
  { key: 'sister', re: /\b(sister|sis)\b/, label: 'your sister', gender: 'female' },
  { key: 'brother', re: /\b(brother|bro)\b/, label: 'your brother', gender: 'male' },
  { key: 'sibling', re: /\bsiblings?\b/, label: 'your sibling', gender: null },
  { key: 'daughter', re: /\bdaughter\b/, label: 'your daughter', gender: 'female' },
  { key: 'son', re: /\bson\b/, label: 'your son', gender: 'male' },
  { key: 'aunt', re: /\b(aunt|aunty|auntie)\b/, label: 'your aunt', gender: 'female' },
  { key: 'uncle', re: /\buncle\b/, label: 'your uncle', gender: 'male' },
  { key: 'niece', re: /\bniece\b/, label: 'your niece', gender: 'female' },
  { key: 'nephew', re: /\bnephew\b/, label: 'your nephew', gender: 'male' },
  { key: 'child', re: /\b(child|children|kids?|baby|toddler|little one)\b/, label: 'the little one', gender: 'child' },
  { key: 'friend', re: /\b(friends?|bestie|bff|buddy|pal)\b/, label: 'your friend', gender: null },
  { key: 'colleague', re: /\b(colleague|coworker|co-worker|boss|manager|teammate)\b/, label: 'your colleague', gender: null },
  { key: 'teacher', re: /\b(teacher|mentor)\b/, label: 'your teacher', gender: null },
  { key: 'her', re: /\b(girl|lady|woman|her)\b/, label: 'her', gender: 'female' },
  { key: 'him', re: /\b(boy|guy|man|gentleman|him)\b/, label: 'him', gender: 'male' },
];

const OCCASIONS: Array<{ key: string; re: RegExp; label: string; emoji: string }> = [
  { key: 'mothers_day', re: /\bmother'?s day\b/, label: "Mother's Day", emoji: '🌷' },
  { key: 'fathers_day', re: /\bfather'?s day\b/, label: "Father's Day", emoji: '👔' },
  { key: 'birthday', re: /\b(birthday|bday|b'day)\b/, label: 'birthday', emoji: '🎂' },
  { key: 'anniversary', re: /\banniversary\b/, label: 'anniversary', emoji: '💍' },
  { key: 'wedding', re: /\b(wedding|marriage|shaadi|engagement)\b/, label: 'wedding', emoji: '💒' },
  { key: 'valentine', re: /\bvalentine'?s?\b/, label: "Valentine's", emoji: '💘' },
  { key: 'diwali', re: /\bdiwali\b/, label: 'Diwali', emoji: '🪔' },
  { key: 'christmas', re: /\b(christmas|xmas)\b/, label: 'Christmas', emoji: '🎄' },
  { key: 'rakhi', re: /\b(rakhi|raksha ?bandhan)\b/, label: 'Rakhi', emoji: '🧵' },
  { key: 'eid', re: /\beid\b/, label: 'Eid', emoji: '🌙' },
  { key: 'festival', re: /\b(festival|festive|holi|navratri|pongal|onam|new year)\b/, label: 'festival', emoji: '🎉' },
  { key: 'graduation', re: /\b(graduat\w*|convocation)\b/, label: 'graduation', emoji: '🎓' },
  { key: 'housewarming', re: /\b(house ?warming|new home|griha pravesh)\b/, label: 'housewarming', emoji: '🏡' },
  { key: 'congrats', re: /\b(congrat\w*|promotion|new job|achievement)\b/, label: 'congratulations', emoji: '🥳' },
  { key: 'thank_you', re: /\b(thank(s| you)?|appreciation|gratitude)\b/, label: 'thank-you', emoji: '🙏' },
  { key: 'farewell', re: /\b(farewell|goodbye|retire\w*)\b/, label: 'farewell', emoji: '👋' },
  { key: 'just_because', re: /\b(just because|no occasion|no reason|nothing special|random)\b/, label: 'just-because', emoji: '💝' },
];

/** Hints that map shopper words onto the store's top-level categories. */
const CATEGORY_HINTS: Array<{ re: RegExp; root: RegExp; emoji: string }> = [
  { re: /\b(skin ?care|beauty|serums?|sunscreens?|suncreens?|moisturi[sz]ers?|creams?|lotions?|cosmetics?|self[- ]care)\b/, root: /skin/i, emoji: '🌸' },
  { re: /\b(clothes|clothing|cloth|fashion|apparel|outfits?|wear|shirts?|tops?|dress(es)?|tank ?tops?)\b/, root: /cloth/i, emoji: '👗' },
  { re: /\b(jewel\w*|accessor\w*|necklaces?|earrings?|earings?|rings?|bracelets?|braclets?|bangles?|watch(es)?|pendants?)\b/, root: /jewel|accessor/i, emoji: '💍' },
  { re: /\b(appliances?|electric\w*|gadgets?|tech|espresso|coffee|purifier|vacuum|kitchen)\b/, root: /appliance|electr/i, emoji: '☕' },
  { re: /\b(furniture|sofa|chairs?|tables?|decor)\b/, root: /furniture/i, emoji: '🛋️' },
];

const RECIPIENT_PILLS = ['👩 Mom', '👨 Dad', '💑 Partner', '🧑‍🤝‍🧑 Friend', '👫 Sibling', '🧒 Child', '💼 Colleague', '👵 Grandparent'];
const GENDER_PILLS = ['👩 Woman', '👨 Man', '🧒 Child', "🤗 Doesn't matter"];
const OCCASION_PILLS = ['🎂 Birthday', '💍 Anniversary', '💒 Wedding', '🎉 Festival', '🙏 Thank You', '💝 Just Because'];
const BUDGET_PILLS = ['Under $50', '$50 – $200', '$200 – $1,000', '$1,000+', '✨ No fixed budget'];

// ---------------------------------------------------------------------------
// Parsing helpers
// ---------------------------------------------------------------------------

export function normalize(prompt: string): string {
  return prompt
    .replace(ASSISTANT_MENTION, '')
    .toLowerCase()
    .replace(/[\u2018\u2019]/g, "'")
    // drop emoji / symbols (pill labels carry them) but keep currency and dashes
    .replace(/[^\x00-\x7F\u20B9\u2013\u2014]/g, ' ')
    .replace(/([a-z])\1{2,}/g, '$1') // "hiiii" → "hi" (letters only, so 1000 stays 1000)
    .replace(/\s+/g, ' ')
    .trim();
}

function matchRecipient(text: string) {
  return RECIPIENTS.find((r) => r.re.test(text)) || null;
}

export function parseGender(text: string, allowAny: boolean): Gender | null {
  if (/\b(child|kids?|baby|toddler|little one)\b/.test(text)) return 'child';
  if (/\b(female|woman|women|lady|ladies|girl|she|her)\b/.test(text)) return 'female';
  if (/\b(male|man|men|guy|gents|boy|he|him)\b/.test(text)) return 'male';
  if (allowAny && /\b(doesn'?t matter|either|any|both|prefer not|skip|not sure|unisex|neutral)\b/.test(text)) return 'any';
  return null;
}

function matchOccasion(text: string) {
  return OCCASIONS.find((o) => o.re.test(text)) || null;
}

const NUM = String.raw`(\d+(?:\.\d+)?)\s*(k)?`;
const toNum = (n: string, k?: string) => parseFloat(n) * (k ? 1000 : 1);

/** Parse "under $50", "$50 – $200", "1000+", "around 500", "no budget". Bare numbers only count during the budget step. */
export function parseBudget(raw: string, bareNumbersAllowed: boolean): Budget | 'any' | null {
  const t = raw.replace(/,/g, '').replace(/\b(rs\.?|inr|usd|dollars?|bucks|rupees)\b|[$₹]/g, ' $ ').replace(/\s+/g, ' ');
  if (/\b(no (fixed )?budget|no limit|any budget|unlimited|flexible|whatever)\b/.test(t)) return 'any';
  if (bareNumbersAllowed && /\b(doesn'?t matter|anything|any)\b/.test(t)) return 'any';

  let m = t.match(new RegExp(String.raw`\$?\s*${NUM}\s*(?:-|–|—|to)\s*\$?\s*${NUM}(?![a-z\d])`));
  if (m) {
    const a = toNum(m[1], m[2]);
    const b = toNum(m[3], m[4]);
    return { min: Math.min(a, b), max: Math.max(a, b) };
  }
  m = t.match(new RegExp(String.raw`\b(?:under|below|less than|up ?to|upto|max(?:imum)?|within|not more than)\s*\$?\s*${NUM}`));
  if (m) return { min: null, max: toNum(m[1], m[2]) };
  m = t.match(new RegExp(String.raw`\b(?:around|about|roughly|approx\w*)\s*\$?\s*${NUM}`));
  if (m) {
    const n = toNum(m[1], m[2]);
    return { min: Math.round(n * 0.7), max: Math.round(n * 1.2) };
  }
  m = t.match(new RegExp(String.raw`\$?\s*${NUM}\s*\+|\b(?:above|over|more than|at least|min(?:imum)?)\s*\$?\s*${NUM}`));
  if (m) return m[1] ? { min: toNum(m[1], m[2]), max: null } : { min: toNum(m[3], m[4]), max: null };
  m = t.match(new RegExp(String.raw`\$\s*${NUM}|${NUM}\s*\$`));
  if (m) return { min: null, max: m[1] ? toNum(m[1], m[2]) : toNum(m[3], m[4]) };
  if (bareNumbersAllowed) {
    m = t.match(new RegExp(String.raw`^\D*${NUM}(?![a-z\d])\D*$`));
    if (m) return { min: null, max: toNum(m[1], m[2]) };
  }
  return null;
}

export const money = (n: number) => `$${n.toLocaleString('en-US', { maximumFractionDigits: 2 })}`;

export function budgetPhrase(b?: Budget | null): string {
  if (!b || (b.min == null && b.max == null)) return '';
  if (b.min != null && b.max != null) return `between ${money(b.min)} and ${money(b.max)}`;
  if (b.max != null) return `under ${money(b.max)}`;
  return `over ${money(b.min as number)}`;
}

export const pick = <T,>(items: T[]): T => items[Math.floor(Math.random() * items.length)];
export const pills = (labels: string[]) => '\n\n' + labels.map((l) => `[ ${l} ]`).join('  ');

function pronouns(g?: Gender | null) {
  if (g === 'female') return { subj: 'she', obj: 'her', poss: 'her' };
  if (g === 'male') return { subj: 'he', obj: 'him', poss: 'his' };
  return { subj: 'they', obj: 'them', poss: 'their' };
}

// ---------------------------------------------------------------------------
// Catalog helpers
// ---------------------------------------------------------------------------

export type Cat = { id: string; name: string; parentId: string | null };

function subtreeIds(cats: Cat[], rootId: string): string[] {
  const out = [rootId];
  for (let i = 0; i < out.length; i++) {
    for (const c of cats) if (c.parentId === out[i]) out.push(c.id);
  }
  return out;
}

const roots = (cats: Cat[]) => cats.filter((c) => !c.parentId);
export const emojiFor = (name: string) => CATEGORY_HINTS.find((h) => h.root.test(name))?.emoji || '🛍️';

export function matchCategory(text: string, cats: Cat[]): Cat | null {
  const rootCats = roots(cats);
  const direct = rootCats.find((c) => text.includes(c.name.toLowerCase()));
  if (direct) return direct;
  for (const hint of CATEGORY_HINTS) {
    if (hint.re.test(text)) {
      const root = rootCats.find((c) => hint.root.test(c.name));
      if (root) return root;
    }
  }
  return null;
}

/**
 * Category ids to search for a given recipient. Gendered sub-trees (e.g. Clothes → Women)
 * are narrowed so a gift for mom doesn't surface men's shirts. Returns [] when the
 * category has gendered sections but none for this recipient (e.g. no kids' clothing).
 */
export function idsForRecipient(cats: Cat[], rootId: string, gender?: Gender | null): string[] {
  const all = subtreeIds(cats, rootId);
  const children = cats.filter((c) => all.includes(c.id) && c.id !== rootId);
  const isFemale = (c: Cat) => /\b(women|woman|ladies|female|girls?)\b/i.test(c.name);
  const isMale = (c: Cat) => /^(men|man|male|boys?)\b|\bmen'?s\b/i.test(c.name);
  const isKids = (c: Cat) => /\b(kids?|child\w*|baby|babies|boys|girls|junior)\b/i.test(c.name);
  const gendered = children.filter((c) => isFemale(c) || isMale(c) || isKids(c));
  if (gendered.length === 0 || !gender || gender === 'any') return all;

  const node = children.find(gender === 'female' ? isFemale : gender === 'male' ? isMale : isKids);
  return node ? subtreeIds(cats, node.id) : [];
}

export function priceFilter(b?: Budget | null) {
  if (!b) return {};
  const price: { gte?: number; lte?: number } = {};
  if (b.min != null) price.gte = b.min;
  if (b.max != null) price.lte = b.max;
  return Object.keys(price).length ? { price } : {};
}

export const MALE_PRODUCT = /\b(men'?s|man'?s|for him|male|gents)\b/i;
export const FEMALE_PRODUCT = /\b(women'?s|woman'?s|for her|ladies|female)\b/i;

const PRODUCT_SELECT = {
  id: true,
  title: true,
  description: true,
  price: true,
  rating: true,
  attributes: true,
  category: { select: { name: true } },
} as const;

interface Picks {
  picks: RankedProduct[];
  /** exact = matched what they asked for; similar = neighbouring colour; fallback = asked-for thing not found */
  match: 'exact' | 'similar' | 'fallback' | 'none';
  similarColor: string | null;
}

async function findPicks(prisma: PrismaClient, cats: Cat[], state: GiftState, categoryId: string, take = 3): Promise<Picks> {
  const empty: Picks = { picks: [], match: 'none', similarColor: null };
  const ids = idsForRecipient(cats, categoryId, state.gender);
  if (ids.length === 0) return empty;
  const products: CatalogProduct[] = await prisma.product.findMany({
    where: { stock: { gt: 0 }, categoryId: { in: ids }, ...priceFilter(state.budget) },
    select: PRODUCT_SELECT,
  });

  const scored = products
    .map((p) => {
      const text = `${p.title} ${p.description}`;
      let score = 0;
      if (state.gender === 'female') score += FEMALE_PRODUCT.test(text) ? 2 : MALE_PRODUCT.test(text) ? -5 : 0;
      if (state.gender === 'male') score += MALE_PRODUCT.test(text) ? 2 : FEMALE_PRODUCT.test(text) ? -5 : 0;
      return { p, score };
    })
    .filter((s) => s.score > -5);
  scored.sort((a, b) => b.score - a.score || b.p.rating - a.p.rating || b.p.price - a.p.price);
  const ranked = scored.map((s) => s.p);
  if (ranked.length === 0) return empty;

  if (!hasPreferences(state.prefs)) {
    return { picks: ranked.slice(0, take).map((product) => ({ product, note: null })), match: 'exact', similarColor: null };
  }
  const m = matchPreferences(ranked, state.prefs);
  if (m.exact.length) return { picks: m.exact.slice(0, take), match: 'exact', similarColor: null };
  if (m.similar.length) return { picks: m.similar.slice(0, take), match: 'similar', similarColor: m.similarColor };
  return { picks: ranked.slice(0, take).map((product) => ({ product, note: null })), match: 'fallback', similarColor: null };
}

async function availableCategories(prisma: PrismaClient, cats: Cat[], state: GiftState) {
  const out: Cat[] = [];
  for (const root of roots(cats)) {
    const ids = idsForRecipient(cats, root.id, state.gender);
    if (ids.length === 0) continue;
    const count = await prisma.product.count({
      where: { stock: { gt: 0 }, categoryId: { in: ids }, ...priceFilter(state.budget) },
    });
    if (count > 0) out.push(root);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Conversation
// ---------------------------------------------------------------------------

function nextStep(s: GiftState): Step {
  if (!s.recipient) return 'RECIPIENT';
  if (!s.gender) return 'GENDER';
  if (!s.occasion) return 'OCCASION';
  if (s.budget === undefined || s.budget === null) return 'BUDGET';
  if (!s.categoryId) return 'CATEGORY';
  return 'RESULTS';
}

function giftSummary(s: GiftState): string {
  const occ = s.occasion && s.occasion.key !== 'just_because' ? `${s.occasion.label} ` : '';
  return `${/^[aeiou]/i.test(occ) ? 'an' : 'a'} ${occ}gift for ${s.recipient?.label || 'someone special'}`;
}

function question(step: Step, s: GiftState): string {
  const who = s.recipient?.label || 'them';
  switch (step) {
    case 'RECIPIENT':
      return `Who's the lucky person you're shopping for? 😊` + pills(RECIPIENT_PILLS);
    case 'GENDER':
      return (
        pick([
          `So I can pick the right things for ${who} — should I look at gifts for a woman, a man, or a child?`,
          `Quick one so I get it right: are we shopping for a woman, a man, or a little one?`,
        ]) + pills(GENDER_PILLS)
      );
    case 'OCCASION':
      return (
        pick([`What's the occasion? 🎉`, `What are we celebrating? 🥳`]) +
        ` (Feel free to type your own if it's not here!)` +
        pills(OCCASION_PILLS)
      );
    case 'BUDGET':
      return (
        pick([
          `What budget do you have in mind? No pressure — there's something lovely at every price 💸`,
          `How much would you like to spend? Even a small budget can make a big smile 😊`,
        ]) + pills(BUDGET_PILLS)
      );
    default:
      return '';
  }
}

function acknowledge(changed: string[], s: GiftState, fresh: boolean): string {
  if (fresh && s.recipient && changed.length >= 2) {
    return `Oh, how lovely — ${giftSummary(s)}! ${s.occasion?.emoji || '🎁'}`;
  }
  const last = changed[changed.length - 1];
  const who = s.recipient?.label || 'them';
  switch (last) {
    case 'recipient':
      return pick([
        `Aww, a gift for ${who}! That's so thoughtful 💕`,
        `Lovely — shopping for ${who}! 🥰`,
        `Ooh, ${who} is lucky to have you! 😊`,
      ]);
    case 'gender':
      return pick([`Got it, thank you! 🙌`, `Perfect, that helps a lot! ✨`]);
    case 'occasion':
      return s.occasion?.key === 'just_because'
        ? `Gifts for no reason at all are the best kind 💝`
        : pick([`${s.occasion?.emoji} A ${s.occasion?.label} gift — how special!`, `${s.occasion?.emoji} Ooh, ${s.occasion?.label}! Let's make it memorable.`]);
    case 'prefs': {
      const { subj } = pronouns(s.gender);
      const what = s.prefs ? describePreferences(s.prefs, '').trim() : '';
      return pick([
        `Ooh, ${what} — noted! ${subj === 'they' ? 'Let me check' : `Let me see what ${subj}'d love`} 🔍`,
        `${what.replace(/^./, (c) => c.toUpperCase())}, got it! Let me have a look 🔍`,
      ]);
    }
    case 'category':
      return pick([`Great choice! 😍`, `Ooh, good thinking! ✨`]);
    case 'budget':
      return s.budget && (s.budget.min != null || s.budget.max != null)
        ? `${budgetPhrase(s.budget).replace(/^./, (c) => c.toUpperCase())} — got it! 👍`
        : `No budget limits — fun! 😄`;
    default:
      return fresh ? pick([`Ooh, gift hunting! 🎁 I love this part.`, `Yay, let's find something special together! 🎁`]) : '';
  }
}

export async function runGiftFlow(opts: {
  prisma: PrismaClient;
  prompt: string;
  rawState: unknown;
  categories: Cat[];
}): Promise<GiftFlowResult> {
  const { prisma, prompt, categories } = opts;
  const text = normalize(prompt);

  const saved = opts.rawState as GiftState | null;
  const active = !!saved?.step && Date.now() - new Date(saved.updatedAt).getTime() < STATE_TTL_MS;
  const isGift = GIFT_RE.test(text);
  const isReset = /\b(start over|restart|reset|new gift|another gift|start again)\b/.test(text);

  if (!active && !isGift) return { handled: false, state: null, replies: [] };

  if (active && /^(cancel|stop|never ?mind|exit|quit|no thanks)\b/.test(text)) {
    return {
      handled: true,
      state: null,
      replies: [{ content: `No worries at all! 😊 I'm right here whenever you want to pick up the gift hunt again. Happy shopping! 🛍️` }],
    };
  }

  const fresh = !active || isReset;
  const s: GiftState = fresh ? { step: 'RECIPIENT', updatedAt: '' } : { ...saved! };
  const stepBefore = s.step;
  const changed: string[] = [];

  // "Change budget" from the results step re-opens the budget question
  if (!fresh && /\b(change|different|adjust|another|other) budget\b/.test(text)) {
    s.budget = null;
    s.step = 'BUDGET';
    return finish(s, [{ content: `Sure thing! 💰 ` + question('BUDGET', s) }]);
  }

  if (!isReset) {
    const recipient = matchRecipient(text);
    // Pronoun-only matches ("her", "him") shouldn't overwrite a recipient we already know
    if (recipient && !(s.recipient && ['her', 'him'].includes(recipient.key))) {
      s.recipient = { key: recipient.key, label: recipient.label };
      if (recipient.gender) s.gender = recipient.gender;
      changed.push('recipient');
    }

    if (stepBefore === 'GENDER' || !s.gender) {
      const gender = parseGender(text, stepBefore === 'GENDER');
      if (gender) {
        s.gender = gender;
        if (!s.recipient) s.recipient = { key: 'someone', label: gender === 'female' ? 'her' : gender === 'male' ? 'him' : 'the little one' };
        if (!changed.includes('recipient')) changed.push('gender');
      }
    }

    const occasion = matchOccasion(text);
    if (occasion) {
      s.occasion = { key: occasion.key, label: occasion.label, emoji: occasion.emoji };
      changed.push('occasion');
    } else if (
      stepBefore === 'OCCASION' &&
      changed.length === 0 &&
      text.length >= 3 &&
      text.length <= 40 &&
      !/^(hi|hello|hey|ok|okay|yes|no|hmm+|idk|what|why)\b/.test(text)
    ) {
      // An occasion we don't know by name ("her promotion party") — take it as said
      s.occasion = { key: 'custom', label: text, emoji: '🎉' };
      changed.push('occasion');
    }

    const budget = parseBudget(text, stepBefore === 'BUDGET');
    if (budget) {
      s.budget = budget === 'any' ? { min: null, max: null } : budget;
      changed.push('budget');
    }

    const category = matchCategory(text, categories);
    const prefs = extractPreferences(text);
    if (category) {
      // A new category starts a fresh search unless they restated what they want in it
      if (category.id !== s.categoryId && !hasPreferences(prefs)) s.prefs = null;
      s.categoryId = category.id;
      changed.push('category');
    }
    if (hasPreferences(prefs)) {
      s.prefs = prefs;
      changed.push('prefs');
    }
  }

  // Didn't understand the answer — re-ask kindly, then step aside after a couple of misses
  if (!fresh && changed.length === 0) {
    const misses = (s.misses || 0) + 1;
    if (misses >= 2) return { handled: false, state: null, replies: [] };
    s.misses = misses;
    const reAsk =
      stepBefore === 'CATEGORY' || stepBefore === 'RESULTS' ? (await categoryQuestion(s)).content : question(stepBefore, s);
    return finish(s, [{ content: `${pick([`Hmm, I didn't quite catch that 😅`, `Sorry, I'm not sure I followed 🙈`])} ${reAsk}` }]);
  }
  s.misses = 0;

  const step = nextStep(s);
  s.step = step;
  const ack = acknowledge(changed, s, fresh);

  if (step !== 'CATEGORY' && step !== 'RESULTS') {
    return finish(s, [{ content: `${ack}${ack ? '\n\n' : ''}${question(step, s)}` }]);
  }

  if (step === 'CATEGORY') {
    const q = await categoryQuestion(s);
    if (q.noneAvailable) s.step = 'BUDGET';
    return finish(s, [{ content: `${ack}${ack ? '\n\n' : ''}${q.content}` }]);
  }

  return finish(s, await resultReplies(s, ack));

  // --- helpers that close over prisma / categories ---

  function finish(state: GiftState, replies: GenieReply[]): GiftFlowResult {
    state.updatedAt = new Date().toISOString();
    return { handled: true, state, replies };
  }

  async function categoryQuestion(state: GiftState): Promise<{ content: string; noneAvailable: boolean }> {
    const avail = await availableCategories(prisma, categories, state);
    const { obj } = pronouns(state.gender);
    const price = budgetPhrase(state.budget);
    if (avail.length === 0) {
      return {
        noneAvailable: true,
        content:
          `Hmm, I couldn't find anything in stock ${price || 'right now'} that would suit ${obj} 😕 Want to try a different budget?` +
          pills(BUDGET_PILLS),
      };
    }
    return {
      noneAvailable: false,
      content:
        `Here's what I can find for ${obj}${price ? ` ${price}` : ''}. Which kind of gift feels right? Pick one and I'll show you my favourites 👇` +
        pills(avail.map((c) => `${emojiFor(c.name)} ${c.name}`)),
    };
  }

  async function resultReplies(state: GiftState, ackLine: string): Promise<GenieReply[]> {
    const category = categories.find((c) => c.id === state.categoryId)!;
    const { picks, match, similarColor } = await findPicks(prisma, categories, state, category.id);
    const { obj, subj } = pronouns(state.gender);
    const others = (await availableCategories(prisma, categories, state)).filter((c) => c.id !== category.id);
    const followUpPills = [...others.map((c) => `${emojiFor(c.name)} ${c.name}`), '💰 Change budget', '🔄 Start over'];
    const price = budgetPhrase(state.budget);
    const asked = hasPreferences(state.prefs) ? describePreferences(state.prefs, category.name.toLowerCase()) : '';

    if (picks.length === 0) {
      const ids = idsForRecipient(categories, category.id, state.gender);
      const closest = ids.length
        ? await prisma.product.findFirst({
            where: { stock: { gt: 0 }, categoryId: { in: ids } },
            orderBy: { price: state.budget?.max != null ? 'asc' : 'desc' },
            select: { price: true },
          })
        : null;
      const hint = closest ? ` The closest I have there starts at ${money(closest.price)}.` : '';
      return [
        {
          content:
            `Aw, I couldn't find ${category.name} that would suit ${obj} ${price || 'right now'} 😕${hint} How about one of these instead?` +
            pills(followUpPills),
        },
      ];
    }

    const isPronoun = !state.recipient || ['her', 'him', 'someone'].includes(state.recipient.key);
    const forWho = isPronoun ? obj : state.recipient!.label;
    const forWhoPoss = isPronoun ? pronouns(state.gender).poss : `${state.recipient!.label}'s`;
    const occ = state.occasion && state.occasion.key !== 'just_because' ? ` ${state.occasion.label}` : '';

    let lead: string;
    if (asked && match === 'exact') {
      lead = pick([
        `Good news — I found ${picks.length === 1 ? 'something' : 'a few things'} in ${asked} for ${forWho}! 🎉`,
        `Yes! We do have ${asked} that ${subj}'d like 😍`,
      ]);
    } else if (asked && match === 'similar') {
      lead =
        `I looked through all our ${category.name} for ${forWho}, but I couldn't find any ${asked}${price ? ` ${price}` : ''} right now 😕 ` +
        `The closest I have is ${similarColor} — maybe one of these could work?`;
    } else if (asked && match === 'fallback') {
      lead =
        `I looked through all our ${category.name} for ${forWho}, but sadly there's nothing in ${asked}${price ? ` ${price}` : ''} right now 😕 ` +
        `Here are some other lovely picks instead 👇`;
    } else {
      lead = pick([
        `Here are my top ${category.name} picks for ${forWhoPoss}${occ} gift 🎁`,
        `I think ${subj}'ll love these! My favourite ${category.name} picks for ${forWho} ✨`,
      ]);
    }

    return [
      { content: `${ackLine}${ackLine ? '\n\n' : ''}${lead} Vote on them so the whole group can weigh in 🗳️` },
      ...picks.map(({ product, note }, i) => ({
        productId: product.id,
        content: `${i === 0 ? '🏆 My top pick' : '💡 Another lovely option'} — ⭐ ${product.rating.toFixed(1)}${note ? ` · ${note}` : ''}`,
      })),
      {
        content:
          pick([`Anything catch your eye? 👀`, `What do you think? 😊`]) +
          ` Tell me more about what ${subj} like${subj === 'they' ? '' : 's'} (a colour, material…), or I can show you another category, adjust the budget, or we can start over.` +
          pills(followUpPills),
      },
    ];
  }
}

/** Value to persist on GroupShoppingSession.genieState */
export function toDbState(state: GiftState | null) {
  return state ? (state as unknown as Prisma.InputJsonValue) : Prisma.DbNull;
}
