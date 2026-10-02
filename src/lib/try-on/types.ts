import type { WearableItemType } from './wearableItems';

export type TryOnCategory =
  | 'TOP'
  | 'BOTTOM'
  | 'ONE_PIECE'
  | 'DRESS'
  | 'OUTERWEAR'
  | 'FULL_OUTFIT'
  | 'SAREE'
  | 'KURTI'
  | 'SHIRT'
  | 'T_SHIRT'
  | 'JEANS'
  | 'PANTS'
  | 'SKIRT'
  | 'JACKET'
  | 'HOODIE'
  | 'ACCESSORY'
  | 'UNSUPPORTED';

export type TryOnMethod =
  | 'AI_VTON'
  | 'FACE_AR'
  | 'HAND_AR'
  | 'BODY_AR'
  | 'UNSUPPORTED';

export type TryOnJobStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

export interface TryOnInput {
  userImageUrl: string;
  productImageUrl: string;
  category: TryOnCategory;
  productId: string;
  userId: string;
  productTitle?: string;
  itemType?: WearableItemType;
  options?: {
    nsfwFilter?: boolean;
    coverFeet?: boolean;
    adjustHands?: boolean;
    restoreBackground?: boolean;
  };
}

export interface TryOnProviderResult {
  providerJobId?: string;
  status: TryOnJobStatus;
  resultImageUrl?: string;
  errorMessage?: string;
}

export interface ITryOnProvider {
  name: string;
  createJob(input: TryOnInput): Promise<TryOnProviderResult>;
  getJobStatus(providerJobId: string): Promise<TryOnProviderResult>;
}
