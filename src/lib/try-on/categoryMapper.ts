import { TryOnCategory, TryOnMethod } from './types';

export interface CategoryMappingResult {
  category: TryOnCategory;
  method: TryOnMethod;
  isSupported: boolean;
  guidanceText: string;
}

/**
 * Maps a Shopora product category name or try-on category to an internal VTON category and method.
 */
export function mapToTryOnCategory(
  rawCategoryName?: string | null,
  productTitle?: string | null,
  explicitTryOnCategory?: string | null
): CategoryMappingResult {
  const name = (explicitTryOnCategory || rawCategoryName || '').toLowerCase().trim();
  const title = (productTitle || '').toLowerCase().trim();

  // Explicit or auto-detected categories
  if (
    name.includes('top') ||
    name.includes('shirt') ||
    name.includes('t-shirt') ||
    name.includes('tshirt') ||
    title.includes('shirt') ||
    title.includes('t-shirt') ||
    title.includes('top') ||
    title.includes('blouse') ||
    title.includes('topwear')
  ) {
    return {
      category: 'TOP',
      method: 'AI_VTON',
      isSupported: true,
      guidanceText: 'Upload a clear photo where your upper body and chest are visible facing the camera.',
    };
  }

  if (
    name.includes('dress') ||
    name.includes('one-piece') ||
    name.includes('one_piece') ||
    name.includes('one piece') ||
    name.includes('saree') ||
    name.includes('gown') ||
    name.includes('kurti') ||
    title.includes('dress') ||
    title.includes('saree') ||
    title.includes('gown') ||
    title.includes('kurti') ||
    title.includes('anarkali')
  ) {
    return {
      category: 'DRESS',
      method: 'AI_VTON',
      isSupported: true,
      guidanceText: 'Upload a clear full-body photo standing straight with good lighting.',
    };
  }

  if (
    name.includes('jacket') ||
    name.includes('coat') ||
    name.includes('blazer') ||
    name.includes('hoodie') ||
    name.includes('sweater') ||
    name.includes('cardigan') ||
    name.includes('outerwear') ||
    title.includes('jacket') ||
    title.includes('coat') ||
    title.includes('blazer') ||
    title.includes('hoodie')
  ) {
    return {
      category: 'OUTERWEAR',
      method: 'AI_VTON',
      isSupported: true,
      guidanceText: 'Upload a clear photo showing your upper body and torso.',
    };
  }

  if (
    name.includes('bottom') ||
    name.includes('jean') ||
    name.includes('pant') ||
    name.includes('trouser') ||
    name.includes('skirt') ||
    name.includes('short') ||
    name.includes('legging') ||
    title.includes('jeans') ||
    title.includes('pants') ||
    title.includes('trousers') ||
    title.includes('skirt')
  ) {
    return {
      category: 'BOTTOM',
      method: 'AI_VTON',
      isSupported: true,
      guidanceText: 'Upload a clear photo where your waist and legs are clearly visible.',
    };
  }

  if (
    name.includes('outfit') ||
    name.includes('suit') ||
    name.includes('tracksuit') ||
    title.includes('suit') ||
    title.includes('co-ord') ||
    title.includes('set')
  ) {
    return {
      category: 'FULL_OUTFIT',
      method: 'AI_VTON',
      isSupported: true,
      guidanceText: 'Upload a clear full-body photo facing the camera.',
    };
  }

  // Eyewear mapping
  if (
    name.includes('glass') ||
    name.includes('eyewear') ||
    name.includes('spectacle') ||
    name.includes('frame') ||
    title.includes('sunglasses') ||
    title.includes('glasses') ||
    title.includes('eyewear')
  ) {
    return {
      category: 'ACCESSORY',
      method: 'AI_VTON',
      isSupported: true,
      guidanceText: 'Upload or take a clear portrait photo showing your face and eyes facing the camera.',
    };
  }

  // Watches & Jewellery mapping
  if (
    name.includes('watch') ||
    name.includes('ring') ||
    name.includes('jewel') ||
    name.includes('bracelet') ||
    name.includes('necklace') ||
    name.includes('earring') ||
    name.includes('pendant') ||
    title.includes('watch') ||
    title.includes('ring') ||
    title.includes('jewel') ||
    title.includes('necklace') ||
    title.includes('bracelet')
  ) {
    return {
      category: 'ACCESSORY',
      method: 'AI_VTON',
      isSupported: true,
      guidanceText: 'Upload or take a clear photo showing your wrist, hands, or upper body pose.',
    };
  }

  // General fashion/retail fallback: all products are enabled for AI Virtual Try-On!
  return {
    category: 'ACCESSORY',
    method: 'AI_VTON',
    isSupported: true,
    guidanceText: 'Upload or take a clear photo facing the camera.',
  };
}
