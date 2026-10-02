/**
 * Fine-grained wearable item detection + try-on prompt construction.
 *
 * mapToTryOnCategory() groups every non-garment into 'ACCESSORY', which is too coarse
 * for an image-editing model: a ring, a necklace and a pair of glasses need very
 * different placement instructions. This module resolves the exact item type.
 */

export type WearableItemType =
  | 'TOP'
  | 'BOTTOM'
  | 'DRESS'
  | 'OUTERWEAR'
  | 'FULL_OUTFIT'
  | 'NECKLACE'
  | 'EARRINGS'
  | 'RING'
  | 'BRACELET'
  | 'WATCH'
  | 'EYEWEAR'
  | 'HAT'
  | 'BAG'
  | 'FOOTWEAR'
  | 'OTHER';

export const GARMENT_ITEM_TYPES: WearableItemType[] = ['TOP', 'BOTTOM', 'DRESS', 'OUTERWEAR', 'FULL_OUTFIT'];

// Order matters: more specific patterns must come before generic ones
// (e.g. "earring" before "ring", "sunglasses" handled by eyewear before anything else).
const ITEM_PATTERNS: Array<[WearableItemType, RegExp]> = [
  ['EARRINGS', /\b(earrings?|ear ?cuffs?|studs?|hoops?|jhumkas?|jhumkis?|danglers?)\b/],
  ['NECKLACE', /\b(necklaces?|pendants?|lockets?|chokers?|chains?|mangalsutra|haar)\b/],
  ['WATCH', /\b(watch(es)?|smartwatch(es)?|chronographs?|timepieces?|wristwatch(es)?)\b/],
  ['BRACELET', /\b(bracelets?|bangles?|kadas?|kadda|cuffs?|anklets?)\b/],
  ['RING', /\b(rings?|solitaires?)\b/],
  ['EYEWEAR', /\b(sunglass(es)?|glasses|spectacles?|eyewear|eyeglass(es)?|goggles?|aviators?|wayfarers?)\b/],
  ['HAT', /\b(hats?|caps?|beanies?|fedoras?|turbans?)\b/],
  ['BAG', /\b(bags?|handbags?|backpacks?|purses?|clutch(es)?|totes?|satchels?|wallets?)\b/],
  ['FOOTWEAR', /\b(shoes?|sneakers?|boots?|sandals?|heels|loafers?|slippers?|footwear|flip ?flops?)\b/],
  ['FULL_OUTFIT', /\b(outfits?|suits?|co-?ords?|tracksuits?|jumpsuits?)\b/],
  ['DRESS', /\b(dress(es)?|gowns?|sarees?|sari|kurtis?|kurtas?|anarkalis?|lehengas?|frocks?|one[- ]piece)\b/],
  ['OUTERWEAR', /\b(jackets?|coats?|blazers?|hoodies?|sweaters?|cardigans?|sweatshirts?|outerwear)\b/],
  ['BOTTOM', /\b(jeans|pants|trousers|skirts?|shorts|leggings|joggers|bottoms?|palazzos?)\b/],
  ['TOP', /\b(t-?shirts?|tees?|shirts?|tops?|blouses?|polos?|tank ?tops?|topwear|crop ?tops?)\b/],
];

const EXPLICIT_ALIASES: Record<string, WearableItemType> = {
  ONE_PIECE: 'DRESS',
  SAREE: 'DRESS',
  KURTI: 'DRESS',
  SHIRT: 'TOP',
  T_SHIRT: 'TOP',
  JEANS: 'BOTTOM',
  PANTS: 'BOTTOM',
  SKIRT: 'BOTTOM',
  JACKET: 'OUTERWEAR',
  HOODIE: 'OUTERWEAR',
  EARRING: 'EARRINGS',
  GLASSES: 'EYEWEAR',
  SUNGLASSES: 'EYEWEAR',
  SHOES: 'FOOTWEAR',
};

function matchText(text: string): WearableItemType | null {
  const normalized = text.toLowerCase();
  for (const [type, pattern] of ITEM_PATTERNS) {
    if (pattern.test(normalized)) return type;
  }
  return null;
}

/**
 * Resolves the item type with precedence: vendor-selected try-on category →
 * product title → store category name. Title beats category name because store
 * categories are often broad ("Jewellery", "Accessories", "Fashion").
 */
export function detectWearableItem(
  explicitTryOnCategory?: string | null,
  productTitle?: string | null,
  categoryName?: string | null
): WearableItemType {
  const explicit = (explicitTryOnCategory || '').toUpperCase().trim();
  if (explicit) {
    if (EXPLICIT_ALIASES[explicit]) return EXPLICIT_ALIASES[explicit];
    if (ITEM_PATTERNS.some(([type]) => type === explicit)) return explicit as WearableItemType;
  }

  return matchText(productTitle || '') || matchText(categoryName || '') || 'OTHER';
}

export function isGarment(item: WearableItemType): boolean {
  return GARMENT_ITEM_TYPES.includes(item);
}

interface ItemPromptSpec {
  label: string;
  placement: string;
  extra?: string;
}

const ITEM_PROMPTS: Record<WearableItemType, ItemPromptSpec> = {
  TOP: {
    label: 'top / upper-body garment',
    placement: "Replace the person's current upper-body garment with this garment.",
    extra: "Keep the person's lower-body clothing unchanged. Preserve the garment's exact cut, neckline, sleeve length, fit, fabric texture, print and any logos or text.",
  },
  BOTTOM: {
    label: 'bottom / lower-body garment',
    placement: "Replace the person's current lower-body garment with this garment.",
    extra: "Keep the person's upper-body clothing unchanged. Preserve the garment's exact length, fit, waistline, colour, fabric and details.",
  },
  DRESS: {
    label: 'dress / one-piece garment',
    placement: "Replace the person's current outfit with this dress or one-piece garment.",
    extra: "Preserve the garment's exact silhouette, length, neckline, drape, embroidery, borders and print. Drape it naturally to the person's pose.",
  },
  OUTERWEAR: {
    label: 'jacket / outerwear',
    placement: 'Put this outerwear on the person, worn over their existing clothing.',
    extra: "Preserve the exact cut, collar, closures, pockets, colour and material. Keep the person's other clothing visible where it naturally would be.",
  },
  FULL_OUTFIT: {
    label: 'full outfit',
    placement: "Replace the person's entire outfit with this outfit.",
    extra: 'Preserve every piece of the outfit exactly as shown, including colours, patterns and fit.',
  },
  NECKLACE: {
    label: 'necklace',
    placement: "Place the necklace around the person's neck, resting naturally on the collarbone and upper chest.",
    extra: 'The chain must follow the curve of the neck and sit behind any hair that falls over the shoulders. Keep the pendant centred. Match the exact chain style, length, metal colour, gemstones and pendant design.',
  },
  EARRINGS: {
    label: 'pair of earrings',
    placement: "Place the earrings on the person's earlobes. If both ears are visible, put one earring on each ear as a matching pair.",
    extra: 'Earrings hang naturally with gravity and are partially hidden by hair only where hair covers the ear. Keep their real-world size small relative to the face. Match the exact design, metal and stones.',
  },
  RING: {
    label: 'ring',
    placement: "Place the ring on the person's ring finger of the visible hand (or the most visible finger if the ring finger is hidden).",
    extra: 'The band must wrap around the finger with correct perspective and be partially occluded by the finger where appropriate. Keep realistic ring size. Match the exact band metal, setting and stones.',
  },
  BRACELET: {
    label: 'bracelet / bangle',
    placement: "Place the bracelet around the person's wrist.",
    extra: 'It must wrap around the wrist in 3D with the back portion hidden behind the wrist. Match the exact design, metal colour and stones.',
  },
  WATCH: {
    label: 'wristwatch',
    placement: "Place the watch on the person's wrist with the dial on top of the wrist.",
    extra: 'The strap must wrap around the wrist in 3D with the back portion hidden. Match the exact dial colour, dial markings, hands, case shape, case metal and strap material. Keep realistic watch size relative to the wrist.',
  },
  EYEWEAR: {
    label: 'pair of glasses / sunglasses',
    placement: "Put the glasses on the person's face: bridge on the nose, lenses centred on the eyes, temple arms going back over the ears.",
    extra: "Remove any glasses the person is already wearing. Match the exact frame shape, frame colour and lens tint; clear lenses must keep the eyes visible. Scale the frame to the person's face width.",
  },
  HAT: {
    label: 'hat / cap',
    placement: "Put the hat on the person's head at a natural angle.",
    extra: "Hair should be compressed or tucked naturally under the hat. Match the exact shape, colour, material and logos.",
  },
  BAG: {
    label: 'bag',
    placement: 'Have the person carry the bag naturally: on the shoulder, across the body or in hand, whichever suits the bag style and the pose.',
    extra: 'Keep realistic bag size relative to the body. Match the exact shape, colour, material, hardware and logos.',
  },
  FOOTWEAR: {
    label: 'footwear',
    placement: "Put the footwear on the person's feet, replacing their current footwear.",
    extra: 'Match the floor perspective and ankle angle. Match the exact design, colour, sole and laces.',
  },
  OTHER: {
    label: 'product',
    placement: 'Have the person wear or hold the product in the most natural way for this kind of item.',
  },
};

export function getItemLabel(item: WearableItemType): string {
  return ITEM_PROMPTS[item].label;
}

/**
 * Builds the editing instruction sent to a multi-image editing model.
 * Image 1 = person photo, Image 2 = product photo.
 */
export function buildTryOnPrompt(item: WearableItemType, productTitle?: string | null): string {
  const spec = ITEM_PROMPTS[item];
  const productName = productTitle ? ` ("${productTitle}")` : '';

  return [
    `You are given two images. Image 1 is a photo of a person. Image 2 is a product photo of a ${spec.label}${productName}.`,
    `Edit Image 1 so the person is wearing the exact ${spec.label} from Image 2. ${spec.placement}`,
    spec.extra || '',
    'Product fidelity: reproduce the product exactly as it appears in Image 2, with the same shape, proportions, colours, materials, patterns, stones and logos. Do not redesign, simplify or substitute it.',
    'Ignore everything in Image 2 that is not the product itself: background, mannequin, model, display stand, packaging, hands, props.',
    "Keep everything else in Image 1 unchanged: the person's face and identity, expression, hair, skin tone, body shape, pose, all other clothing, the background, lighting, camera angle and framing.",
    "Integrate the product photorealistically: realistic scale for the person's body, matching lighting direction and colour temperature, natural contact shadows and reflections, correct occlusion.",
    'Return one photorealistic image with the same framing and aspect ratio as Image 1.',
  ]
    .filter(Boolean)
    .join('\n');
}
