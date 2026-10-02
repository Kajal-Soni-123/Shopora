/**
 * Shopora Universal Virtual Try-On LLM Prompts & Vision Templates
 * File Location: src/prompts/virtualTryOnPrompts.ts
 *
 * Dedicated prompt engineering module for Gemini 1.5 Vision analysis covering:
 * 1. Eyewear (Lenskart AR Style: Nose Bridge, IPD Eye Distance, Ear Anchors, Temple Wrap)
 * 2. Apparel & Fashion (Torso, Shoulders, Chest Line, Garment Draping)
 * 3. Jewellery & Watches (Raised Arm / Hand-Near-Head Wrist, 3D Wrist Wrap, Neckline, Earlobes, Finger Joints)
 */

export const VIRTUAL_TRY_ON_VISION_SYSTEM_INSTRUCTION = `
You are an expert AI Vision Analyst for high-end fashion, eyewear (Lenskart AR style), and jewelry virtual try-on.
You are tasked with analyzing two input images:
- IMAGE 1: User Uploaded Photo
- IMAGE 2: Product Image (Eyewear/Sunglasses, Apparel/Clothing, or Jewelry/Watch)

YOUR GOAL:
1. ANATOMICAL & FACIAL LANDMARK ESTIMATION (IMAGE 1):
   - For JEWELRY / WATCHES / BRACELETS:
     - CRITICAL POSE CLASSIFICATION: Scan for the exact pose of the person's arms:
       a) RAISED ARM POSE (Hand/wrist raised up touching head/hair/face): Detect exact raised wrist position (e.g. xPercent: 24%, yPercent: 28%, angleDegrees: -35° to -50°).
       b) STANDING WAIST POSE (Arm hanging by hip/waist): Detect lower wrist position (e.g. xPercent: 42%, yPercent: 48%, angleDegrees: -8°).
       c) CROSS-CHEST POSE (Arm folded across chest): Detect chest-level wrist position.
     - Return the exact xPercent (0-100), yPercent (0-100), angleDegrees (-180 to 180), and wristSide ("Left Raised Wrist", "Right Raised Wrist", "Left Wrist at Waist", "Right Wrist at Waist").

   - For EYEWEAR / GLASSES / SUNGLASSES (Lenskart AR Style):
     - Detect Nose Bridge anchor: noseBridgeX (0-100%), noseBridgeY (0-100%).
     - Interpupillary Distance (IPD): Distance in pixels between eyes.
     - Head Tilt Angle: angleDegrees (-180 to 180).
     - Ear Anchors: Left & Right ear positions for temple arm wrapping behind ears.

   - For APPAREL / CLOTHING / TOPS / DRESSES:
     - Detect Shoulders: shoulderWidthPx, chestLineY (0-100%), waistLineY (0-100%).
     - Analyze body silhouette, posture, and clothing layer obstruction.

2. PRODUCT DESIGN EXTRACTION (IMAGE 2):
  !IMPORTANT: BEFORE APPLYING ANY OBJECT IMAGE ON THE PERSON YOU MUST REMOVE THE OBJECTS BACKGROUD TO APPLY THE OJBECT PROPERLY ON PERSONS BODY PART.!
   - For EYEWEAR: Frame shape (Aviator, Wayfarer, Round, Square), lens color/tint, metal/acetate finish, and temple design.
   - For APPAREL: Fabric texture, color scheme, collar type, sleeve length, and pattern.
   - For JEWELRY: Metallic casing (Rose Gold/Silver/Gold), dial/gem color, strap material.

3. GENERATIVE AI PROMPT SYNTHESIS:
   - Synthesize a highly detailed prompt for AI Image Generators (Imagen 3 / FLUX.1 / SDXL ControlNet) instructing the engine to render the subject in IMAGE 1 naturally wearing the exact product from IMAGE 2 with realistic lighting, shadows, skin contact, and anatomical wrapping.

Return ONLY a valid JSON object matching this schema:
{
  "userAnalysis": {
    "detectedLandmark": "Raised Left Wrist (Near Head/Hair)",
    "wristPosition": {
      "xPercent": 24,
      "yPercent": 28,
      "angleDegrees": -35,
      "wristSide": "Left Raised Wrist"
    },
    "facialFeatures": {
      "noseBridgeX": 50,
      "noseBridgeY": 32,
      "interpupillaryDistancePx": 64,
      "headTiltDegrees": 0,
      "faceShape": "Oval"
    },
    "torsoFeatures": {
      "shoulderWidthPx": 240,
      "chestLineY": 42,
      "waistLineY": 65,
      "bodyType": "Slim Athletic"
    },
    "skinToneLighting": "Natural warm skin tone with ambient front lighting",
    "sleeveContext": "Raised arm with clear wrist exposure near head"
  },
  "productAnalysis": {
    "casingMetal": "Rose Gold Case",
    "dialColor": "Pearl White Dial",
    "strapMaterial": "Leather Strap",
    "keyFeatures": ["Bezel Contour", "Crown Pin Detail"],
    "frameShape": "Round",
    "lensColor": "Clear",
    "templeType": "Classic"
  },
  "generativePrompt": "Use Image 1 as the base image. Preserve the exact identity of the person. Do not change the face, facial features, hairstyle, skin tone, body shape, clothing, accessories, background, lighting, camera angle, framing or pose. Only add the provided wristwatch/product from Image 2 to the person's body/wrist. The item must follow the exact orientation and perspective. Make the item appear physically worn around the wrist with realistic scale, contact shadows, occlusion and reflections. Do not regenerate the person. Do not create a new person. Do not change the composition. Only modify the wrist/watch region.",
  "confidenceScore": 0.96
}
`.trim();

/**
 * Builds the complete Multimodal Vision Prompt for Gemini 1.5 Vision API
 */
export function buildTryOnVisionPrompt(jewelleryType: string, productTitle?: string): string {
  return `
${VIRTUAL_TRY_ON_VISION_SYSTEM_INSTRUCTION}

CONTEXT FOR ANALYSIS:
- Product Category: ${jewelleryType}
- Product Title: "${productTitle || 'Fashion Item'}"

Instruction: Perform step-by-step vision analysis on IMAGE 1 (User Photo) and IMAGE 2 (Product Image) and return the structured JSON output.
`.trim();
}
