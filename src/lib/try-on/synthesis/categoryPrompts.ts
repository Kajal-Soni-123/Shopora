export interface CategoryAIPrompt {
  category: string;
  systemPrompt: string;
  isolationInstructions: string;
  warpInstructions: string;
  fullVisionPrompt: string;
}

/**
 * Category-Specific AI Vision Prompts for Photorealistic Virtual Try-On
 * Generates tailored instructions for AI image-to-image synthesis engines
 */
export const CATEGORY_AI_PROMPTS: Record<string, CategoryAIPrompt> = {
  WATCH: {
    category: 'Watch / Wristwear',
    systemPrompt: 'You are a photorealistic fashion AI image synthesis pipeline specializing in 3D wristwear and watch virtual try-on.',
    isolationInstructions: 'Isolate ONLY the watch dial, case, and strap from Image 2. Completely remove display pillows, watch stands, boxes, and studio backgrounds.',
    warpInstructions: '3D warp the watch strap around the anatomical cylindrical contours of the user\'s wrist in Image 1. The watch dial must sit on the crest of the wrist.',
    fullVisionPrompt:
      'Photorealistic AI Virtual Try-On for Watch: Take Image 1 (user wrist photo) and Image 2 (watch product image). Extract ONLY the watch case and strap from Image 2, completely stripping away any pillow, stand, or background box. Wrap the watch strap in 3D around the cylindrical shape of the user\'s wrist in Image 1. Render realistic contact shadows, metallic specular reflections, and ambient room lighting.',
  },
  EYEWEAR: {
    category: 'Eyewear / Glasses / Sunglasses',
    systemPrompt: 'You are a photorealistic fashion AI image synthesis pipeline specializing in facial eyewear virtual try-on.',
    isolationInstructions: 'Isolate ONLY the glasses frame, temples, and lenses from Image 2. Remove white backgrounds and product cases.',
    warpInstructions: 'Align and perspective-warp the glasses frame across the nose bridge and eyes of the user\'s face in Image 1.',
    fullVisionPrompt:
      'Photorealistic AI Virtual Try-On for Eyewear: Take Image 1 (user face photo) and Image 2 (eyewear product image). Extract ONLY the frame and lenses from Image 2. Position the glasses precisely over the user\'s eyes and nose bridge in Image 1. Render realistic lens transparency, anti-reflective reflections, and subtle shadow under the frame.',
  },
  JEWELLERY: {
    category: 'Jewellery / Necklaces / Bracelets / Rings',
    systemPrompt: 'You are a photorealistic fashion AI image synthesis pipeline specializing in luxury jewellery virtual try-on.',
    isolationInstructions: 'Isolate ONLY the jewellery item (pendant, chain, gem, or ring) from Image 2. Remove velvet display busts, boxes, and stands.',
    warpInstructions: 'Drape the necklace along neck collarbones or wrap the bracelet around the wrist contour in Image 1.',
    fullVisionPrompt:
      'Photorealistic AI Virtual Try-On for Jewellery: Take Image 1 (user photo) and Image 2 (jewellery product image). Extract ONLY the jewellery piece from Image 2, stripping away all display mounts and boxes. Drape and contour the jewellery naturally along the user\'s skin in Image 1 with metallic highlights and contact drop shadow.',
  },
  APPAREL: {
    category: 'Apparel / Tops / Dresses / Jackets / Shirts',
    systemPrompt: 'You are a photorealistic fashion AI image synthesis pipeline specializing in garment draping and cloth virtual try-on.',
    isolationInstructions: 'Isolate ONLY the clothing garment from Image 2. Remove mannequins, hangers, and studio backdrops.',
    warpInstructions: 'Drape and fit the fabric onto the user\'s torso in Image 1, matching shoulder width, waistline, and body pose.',
    fullVisionPrompt:
      'Photorealistic AI Virtual Try-On for Apparel: Take Image 1 (user body photo) and Image 2 (garment product image). Extract ONLY the garment from Image 2. Drape and conform the fabric to the user\'s torso in Image 1 with realistic fabric folds, seam alignment, and ambient shadows.',
  },
  FOOTWEAR: {
    category: 'Footwear / Shoes / Sneakers / Boots',
    systemPrompt: 'You are a photorealistic fashion AI image synthesis pipeline specializing in footwear virtual try-on.',
    isolationInstructions: 'Isolate ONLY the shoes from Image 2. Remove shoe boxes, retail shelves, and backgrounds.',
    warpInstructions: 'Perspective-fit the shoes onto the user\'s feet in Image 1.',
    fullVisionPrompt:
      'Photorealistic AI Virtual Try-On for Footwear: Take Image 1 (user feet photo) and Image 2 (shoe product image). Extract ONLY the shoes from Image 2. Fit the shoes onto the user\'s feet in Image 1 matching floor perspective and ankle angle with ground contact shadows.',
  },
};

/**
 * Gets the specific AI Vision prompt for any product category
 */
export function getCategoryAIPrompt(categoryName: string): CategoryAIPrompt {
  const cat = (categoryName || '').toUpperCase();
  if (cat.includes('EYEWEAR') || cat.includes('GLASSES') || cat.includes('SUNGLASSES')) {
    return CATEGORY_AI_PROMPTS.EYEWEAR;
  }
  if (cat.includes('JEWELLERY') || cat.includes('NECKLACE') || cat.includes('RING') || cat.includes('BRACELET')) {
    return CATEGORY_AI_PROMPTS.JEWELLERY;
  }
  if (cat.includes('TOP') || cat.includes('APPAREL') || cat.includes('SHIRT') || cat.includes('DRESS') || cat.includes('CLOTHES')) {
    return CATEGORY_AI_PROMPTS.APPAREL;
  }
  if (cat.includes('FOOTWEAR') || cat.includes('SHOE') || cat.includes('SNEAKER')) {
    return CATEGORY_AI_PROMPTS.FOOTWEAR;
  }
  return CATEGORY_AI_PROMPTS.WATCH;
}
