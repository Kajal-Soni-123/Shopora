import { JewelleryType } from './types';
import { isTryOnEnabled } from '@/lib/try-on/tryOnModel';

export interface CategoryGuidance {
  title: string;
  bodyRegion: string;
  instruction: string;
  bulletPoints: string[];
}

export const JEWELLERY_GUIDANCE: Record<string, CategoryGuidance> = {
  // --- EYEWEAR (LENSKART AR STYLE) ---
  EYEWEAR: {
    title: 'Eyewear & Glasses 3D Try-On',
    bodyRegion: 'Face, Nose Bridge & Eyes',
    instruction: 'Ensure your face and eyes are clearly visible facing the camera.',
    bulletPoints: [
      'Look directly into the camera with a neutral face.',
      'Ensure good lighting on your nose bridge and eyes.',
      'Tuck hair behind ears so temple arms align properly.',
      'Remove existing glasses for accurate 3D frame fit.'
    ]
  },
  GLASSES: {
    title: 'Spectacle Frame 3D Try-On',
    bodyRegion: 'Face & Nose Bridge',
    instruction: 'Keep face straight and eyes clearly visible.',
    bulletPoints: [
      'Face camera straight-on for accurate IPD eye-distance measuring.',
      'Clear lighting across nose bridge and cheeks.',
      'Remove existing eyewear.'
    ]
  },
  SUNGLASSES: {
    title: 'Sunglasses AR Try-On',
    bodyRegion: 'Face & Eyes',
    instruction: 'Position face front-and-center for sunglasses styling.',
    bulletPoints: [
      'Look straight ahead into the camera.',
      'Ensure even facial illumination.',
      'Check tint shading and 3D temple wrap behind ears.'
    ]
  },

  // --- APPAREL & CLOTHING ---
  CLOTHING: {
    title: 'Apparel & Fashion Try-On',
    bodyRegion: 'Torso & Shoulders',
    instruction: 'Stand facing the camera with shoulders and waist visible.',
    bulletPoints: [
      'Use a full-body or half-portrait front photo.',
      'Stand upright with shoulders visible.',
      'Avoid bulky coats or loose jackets under the garment.',
      'Ensure clear lighting across your clothing.'
    ]
  },
  TOP: {
    title: 'Top & T-Shirt Try-On',
    bodyRegion: 'Upper Body & Shoulders',
    instruction: 'Keep upper body facing camera for top fitting.',
    bulletPoints: [
      'Stand upright facing camera.',
      'Keep arms slightly away from sides.',
      'Ensure shoulders and neckline are clear.'
    ]
  },
  SHIRT: {
    title: 'Shirt & Blouse Try-On',
    bodyRegion: 'Torso & Collar Region',
    instruction: 'Ensure chest and collar line are visible.',
    bulletPoints: [
      'Front portrait facing forward.',
      'Collar and chest exposed clearly.',
      'Natural lighting on torso.'
    ]
  },
  DRESS: {
    title: 'Dress & Gown Try-On',
    bodyRegion: 'Full Body & Silhouette',
    instruction: 'Full body pose for natural dress draping.',
    bulletPoints: [
      'Full body portrait facing forward.',
      'Arms relaxed by sides.',
      'Clear uncluttered background.'
    ]
  },
  JACKET: {
    title: 'Jacket & Coat Try-On',
    bodyRegion: 'Shoulders & Outerwear',
    instruction: 'Stand straight for outer jacket fit.',
    bulletPoints: [
      'Front-facing portrait.',
      'Clear shoulder line.',
      'Even lighting.'
    ]
  },
  PANTS: {
    title: 'Bottoms & Pants Try-On',
    bodyRegion: 'Waist & Legs',
    instruction: 'Full lower body photo facing camera.',
    bulletPoints: [
      'Full body or waist-down photo.',
      'Feet shoulder-width apart.'
    ]
  },

  // --- JEWELLERY & WATCHES ---
  NECKLACE: {
    title: 'Necklace Try-On',
    bodyRegion: 'Neck & Upper Chest',
    instruction: 'Make sure your neck and upper chest are clearly visible.',
    bulletPoints: [
      'Make sure your neck and upper chest are clearly visible.',
      'Use a well-lit front-facing portrait photo.',
      'Avoid high-collared shirts or scarves covering your neck.',
      'Keep your face facing forward with clear lighting.'
    ]
  },
  EARRINGS: {
    title: 'Earrings Try-On',
    bodyRegion: 'Face & Ears',
    instruction: 'Make sure both ears and your face are clearly visible.',
    bulletPoints: [
      'Make sure both ears and your face are clearly visible.',
      'Tuck hair behind your ears or tie hair back.',
      'Face directly towards the camera.',
      'Ensure bright, even lighting around your ears.'
    ]
  },
  RING: {
    title: 'Ring Try-On',
    bodyRegion: 'Hand & Fingers',
    instruction: 'Make sure the hand and finger are clearly visible.',
    bulletPoints: [
      'Make sure your hand and fingers are clearly visible.',
      'Hold your hand flat or open toward the camera.',
      'Keep fingers slightly spread for natural fitting.',
      'Avoid blurry or motion-distorted hand photos.'
    ]
  },
  BRACELET: {
    title: 'Bracelet Try-On',
    bodyRegion: 'Wrist & Forearm',
    instruction: 'Make sure your wrist and lower arm are clearly visible.',
    bulletPoints: [
      'Make sure your wrist and lower arm are clearly visible.',
      'Keep sleeves pulled back above the wrist.',
      'Hold your arm in a natural open pose.',
      'Ensure good lighting on your wrist area.'
    ]
  },
  WATCH: {
    title: 'Watch Try-On',
    bodyRegion: 'Wrist & Forearm',
    instruction: 'Make sure your wrist and forearm are clearly visible.',
    bulletPoints: [
      'Make sure your wrist and lower arm are clearly visible.',
      'Keep sleeves rolled up clear of the wrist.',
      'Hold your wrist flat facing the camera.',
      'Ensure crisp focus on your wrist skin tone.'
    ]
  }
};

/**
 * Detects the try-on category based on product category, title, tags, or attributes.
 */
export function detectJewelleryType(product: {
  title?: string;
  category?: { name?: string; slug?: string } | string;
  attributes?: Record<string, any>;
}): JewelleryType | null {
  if (!product) return null;

  // Check explicit attribute first if present
  if (product.attributes?.jewelleryType || product.attributes?.tryOnCategory) {
    const rawType = String(product.attributes.jewelleryType || product.attributes.tryOnCategory).toUpperCase();
    if (Object.keys(JEWELLERY_GUIDANCE).includes(rawType)) {
      return rawType as JewelleryType;
    }
  }

  const searchText = [
    product.title || '',
    typeof product.category === 'string' ? product.category : product.category?.name || '',
    typeof product.category === 'object' ? product.category?.slug || '' : '',
    JSON.stringify(product.attributes || {})
  ]
    .join(' ')
    .toLowerCase();

  // Eyewear Detection (Lenskart Categories)
  if (searchText.includes('sunglass') || searchText.includes('sun glass') || searchText.includes('goggle') || searchText.includes('aviator') || searchText.includes('wayfarer')) {
    return 'SUNGLASSES';
  }
  if (searchText.includes('glass') || searchText.includes('spectacle') || searchText.includes('eyewear') || searchText.includes('frame') || searchText.includes('lens')) {
    return 'EYEWEAR';
  }

  // Apparel & Clothing Detection
  if (searchText.includes('shirt') || searchText.includes('blouse')) {
    return 'SHIRT';
  }
  if (searchText.includes('dress') || searchText.includes('gown') || searchText.includes('frock')) {
    return 'DRESS';
  }
  if (searchText.includes('jacket') || searchText.includes('coat') || searchText.includes('blazer') || searchText.includes('hoodie')) {
    return 'JACKET';
  }
  if (searchText.includes('top') || searchText.includes('t-shirt') || searchText.includes('tshirt') || searchText.includes('tee')) {
    return 'TOP';
  }
  if (searchText.includes('pants') || searchText.includes('trousers') || searchText.includes('jeans') || searchText.includes('bottom')) {
    return 'PANTS';
  }
  if (searchText.includes('clothing') || searchText.includes('apparel') || searchText.includes('wear') || searchText.includes('fashion')) {
    return 'CLOTHING';
  }

  // Jewellery Detection
  if (searchText.includes('necklace') || searchText.includes('pendant') || searchText.includes('locket') || searchText.includes('chain')) {
    return 'NECKLACE';
  }
  if (searchText.includes('earring') || searchText.includes('stud') || searchText.includes('hoop') || searchText.includes('jhumka')) {
    return 'EARRINGS';
  }
  if (searchText.includes('ring') || searchText.includes('band') || searchText.includes('solitaire')) {
    return 'RING';
  }
  if (searchText.includes('bracelet') || searchText.includes('bangle') || searchText.includes('kadda')) {
    return 'BRACELET';
  }
  if (searchText.includes('watch') || searchText.includes('chronograph') || searchText.includes('timepiece')) {
    return 'WATCH';
  }

  // Generic fallbacks
  if (searchText.includes('jewel')) return 'NECKLACE';
  if (searchText.includes('cloth')) return 'CLOTHING';

  return 'WATCH'; // Default Try-On fallback
}

/**
 * Checks if a product is eligible for virtual try-on
 */
export function isProductEligibleForTryOn(product: {
  isTryOnAvailable?: boolean;
  model3dUrl?: string | null;
  tryOnImage?: string | null;
  image?: string;
  title?: string;
  category?: any;
  attributes?: any;
}): boolean {
  if (!product) return false;
  if (!isTryOnEnabled(product)) return false;

  const type = detectJewelleryType(product);
  return type !== null && (Boolean(product.tryOnImage) || Boolean(product.image));
}
