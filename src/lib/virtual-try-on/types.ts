export type JewelleryType =
  | 'NECKLACE'
  | 'EARRINGS'
  | 'RING'
  | 'BRACELET'
  | 'WATCH'
  | 'EYEWEAR'
  | 'GLASSES'
  | 'SUNGLASSES'
  | 'CLOTHING'
  | 'TOP'
  | 'SHIRT'
  | 'DRESS'
  | 'JACKET'
  | 'PANTS';

export interface LLMVisionAnalysis {
  userAnalysis: {
    detectedLandmark: string;
    wristPosition: {
      xPercent: number;
      yPercent: number;
      angleDegrees: number;
      wristSide: string;
    };
    skinToneLighting: string;
    sleeveContext: string;
    // Lenskart Eyewear & Facial Features
    facialFeatures?: {
      noseBridgeX: number;
      noseBridgeY: number;
      interpupillaryDistancePx: number;
      headTiltDegrees: number;
      faceShape: string;
    };
    // Apparel Torso Features
    torsoFeatures?: {
      shoulderWidthPx: number;
      chestLineY: number;
      waistLineY: number;
      bodyType: string;
    };
  };
  productAnalysis: {
    casingMetal: string;
    dialColor: string;
    strapMaterial: string;
    keyFeatures: string[];
    // Eyewear Specific
    frameShape?: string;
    lensColor?: string;
    templeType?: string;
  };
  generativePrompt: string;
  confidenceScore: number;
}

export interface VirtualTryOnRequest {
  userImage: string; // Base64 data URL or URL
  productId: string;
  jewelleryType?: JewelleryType;
}

export interface VirtualTryOnResponse {
  success: boolean;
  resultImageUrl?: string;
  error?: string;
  details?: string;
  jewelleryType?: JewelleryType;
  providerName?: string;
  llmAnalysis?: LLMVisionAnalysis;
}

export interface VirtualTryOnInput {
  userImage: string | Buffer;
  productImage: string | Buffer;
  jewelleryType: JewelleryType;
  productId?: string;
  productTitle?: string;
  llmAnalysis?: LLMVisionAnalysis;
}

export interface VirtualTryOnProviderResult {
  imageUrl: string;
  processingTimeMs?: number;
  providerName?: string;
  llmAnalysis?: LLMVisionAnalysis;
  requestId?: string;
  model?: string;
  provider?: string;
}

export interface VirtualTryOnProvider {
  name: string;
  generateTryOn(input: VirtualTryOnInput): Promise<VirtualTryOnProviderResult>;
}

export interface WatchVirtualTryOnProvider {
  generateTryOn(params: {
    userImageUrl: string;
    productImageUrl: string;
  }): Promise<{
    resultImageUrl: string;
    resultId?: string;
  }>;
}
