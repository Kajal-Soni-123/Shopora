export interface ValidationResult {
  isValid: boolean;
  error?: string;
  mimeType?: string;
  sizeBytes?: number;
}

/**
 * Validates user-uploaded image for AI Virtual Try-On.
 * Checks MIME types, size limits (max 15MB), base64 format, or URL syntax.
 */
export function validateUserImage(imageData: string): ValidationResult {
  if (!imageData || typeof imageData !== 'string' || imageData.trim().length === 0) {
    return {
      isValid: false,
      error: 'Please upload a photo of yourself to continue.',
    };
  }

  const trimmed = imageData.trim();

  // 1. Data URL Base64 Validation
  if (trimmed.startsWith('data:')) {
    const matches = trimmed.match(/^data:(image\/(png|jpeg|jpg|webp));base64,(.+)$/i);
    if (!matches) {
      return {
        isValid: false,
        error: 'Unsupported image format. Please upload a PNG, JPG, JPEG, or WEBP photo.',
      };
    }

    const mimeType = matches[1];
    const base64Data = matches[3];
    
    // Estimate size from base64 string
    const sizeInBytes = Math.round((base64Data.length * 3) / 4);
    const maxSizeBytes = 15 * 1024 * 1024; // 15MB

    if (sizeInBytes > maxSizeBytes) {
      return {
        isValid: false,
        error: 'The uploaded image is too large (maximum limit is 15MB). Please use a smaller photo.',
      };
    }

    if (sizeInBytes < 5 * 1024) { // Less than 5KB
      return {
        isValid: false,
        error: 'The uploaded image appears corrupted or too low resolution.',
      };
    }

    return {
      isValid: true,
      mimeType,
      sizeBytes: sizeInBytes,
    };
  }

  // 2. HTTP / HTTPS URL Validation
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    try {
      const url = new URL(trimmed);
      if (!url.pathname.match(/\.(png|jpg|jpeg|webp)$/i) && !url.hostname) {
        return {
          isValid: false,
          error: 'Please provide a valid image URL ending in .jpg, .png, or .webp',
        };
      }
      return {
        isValid: true,
        mimeType: 'image/jpeg',
      };
    } catch {
      return {
        isValid: false,
        error: 'Invalid image URL format.',
      };
    }
  }

  return {
    isValid: false,
    error: 'Please upload a valid image file or URL.',
  };
}
