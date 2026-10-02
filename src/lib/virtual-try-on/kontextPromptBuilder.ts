import { LLMVisionAnalysis, JewelleryType } from './types';

export interface BuildKontextPromptInput {
  jewelleryType: JewelleryType | string;
  productTitle?: string;
  llmAnalysis?: LLMVisionAnalysis | null;
}

/**
 * Constructs an image editing instruction for FLUX.1 Kontext.
 * 
 * CRITICAL REQUIREMENTS:
 * 1. Instructs the model to EDIT the provided base photograph rather than generating a new person.
 * 2. Mandates 100% preservation of face, facial features, hairstyle, skin tone, body shape, clothing, pose, camera perspective, lighting, and background.
 * 3. Appends structured product details & anatomical positioning guidance extracted by Gemini Vision.
 */
export function buildKontextPrompt(input: BuildKontextPromptInput): string {
  const { jewelleryType, productTitle, llmAnalysis } = input;
  const itemLabel = productTitle || jewelleryType || 'item';

  const categoryUpper = (jewelleryType || '').toUpperCase();
  const isWatch = categoryUpper === 'WATCH';
  const isBracelet = categoryUpper === 'BRACELET';
  const isEyewear = ['EYEWEAR', 'GLASSES', 'SUNGLASSES'].includes(categoryUpper);
  const isApparel = ['CLOTHING', 'TOP', 'SHIRT', 'DRESS', 'JACKET', 'PANTS'].includes(categoryUpper);
  const isNecklace = categoryUpper === 'NECKLACE';
  const isEarrings = categoryUpper === 'EARRINGS';
  const isRing = categoryUpper === 'RING';

  let targetRegionDescription = 'target body/wrist area';
  if (isWatch || isBracelet) targetRegionDescription = "user's wrist and lower arm area";
  else if (isEyewear) targetRegionDescription = "user's face and nose bridge area";
  else if (isApparel) targetRegionDescription = "user's torso and shoulder area";
  else if (isNecklace) targetRegionDescription = "user's neck and collarbone area";
  else if (isEarrings) targetRegionDescription = "user's earlobes";
  else if (isRing) targetRegionDescription = "user's finger";

  const basePreservationInstruction = `Edit the provided photograph rather than generating a new person.
Preserve the exact identity and appearance of the person in the source image.
Preserve:
- face
- facial features
- hairstyle
- skin tone
- body proportions
- clothing
- pose
- camera perspective
- lighting
- background
- composition

Only modify the ${targetRegionDescription} required for the virtual try-on.
Add the specified ${itemLabel} naturally onto the user.
The item must follow the existing anatomy, orientation, and perspective.
Maintain realistic scale relative to the body.
The item must appear physically attached rather than floating.
Create realistic:
- contact shadows
- occlusion
- reflections
- highlights
- material appearance
- depth
- perspective
- skin contact

Do not alter unrelated areas of the photograph.
Do not regenerate the person's face or body.
Do not replace the background.
Do not create a different person.
Only perform the requested product try-on edit.`;

  // Extract structured Gemini Vision details if available
  const productDetails: string[] = [];
  if (llmAnalysis?.productAnalysis) {
    const pa = llmAnalysis.productAnalysis;
    if (pa.casingMetal) productDetails.push(`Material/Finish: ${pa.casingMetal}`);
    if (pa.dialColor) productDetails.push(`Color/Dial: ${pa.dialColor}`);
    if (pa.strapMaterial) productDetails.push(`Strap/Band: ${pa.strapMaterial}`);
    if (pa.keyFeatures && Array.isArray(pa.keyFeatures) && pa.keyFeatures.length > 0) {
      productDetails.push(`Key visual elements: ${pa.keyFeatures.join(', ')}`);
    }
    if (pa.frameShape) productDetails.push(`Frame shape: ${pa.frameShape}`);
    if (pa.lensColor) productDetails.push(`Lens color: ${pa.lensColor}`);
  }

  const landmarkDetails: string[] = [];
  if (llmAnalysis?.userAnalysis) {
    const ua = llmAnalysis.userAnalysis;
    if (ua.detectedLandmark) landmarkDetails.push(`Target landmark: ${ua.detectedLandmark}`);
    if (ua.skinToneLighting) landmarkDetails.push(`Lighting context: ${ua.skinToneLighting}`);
  }

  let fullPrompt = basePreservationInstruction;

  if (productDetails.length > 0) {
    fullPrompt += `\n\nProduct Visual Characteristics:\n- ${productDetails.join('\n- ')}`;
  }

  if (landmarkDetails.length > 0) {
    fullPrompt += `\n\nTarget Placement Guidance:\n- ${landmarkDetails.join('\n- ')}`;
  }

  return fullPrompt;
}
