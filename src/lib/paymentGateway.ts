/**
 * Shopora Payment Gateway Service Engine
 * Provides card validation, card type detection, UPI ID format check,
 * intent token creation, and 3D Secure (3DS) OTP validation.
 */

export interface CardBrandInfo {
  brand: 'visa' | 'mastercard' | 'amex' | 'discover' | 'unknown';
  name: string;
  icon: string;
  pattern: RegExp;
}

export const CARD_BRANDS: CardBrandInfo[] = [
  {
    brand: 'visa',
    name: 'Visa',
    icon: '💳',
    pattern: /^4[0-9]{12}(?:[0-9]{3})?$/,
  },
  {
    brand: 'mastercard',
    name: 'Mastercard',
    icon: '💳',
    pattern: /^5[1-5][0-9]{14}$|^2(?:2(?:2[1-9]|[3-9][0-9])|[3-6][0-9]{2}|7(?:[01][0-9]|20))[0-9]{12}$/,
  },
  {
    brand: 'amex',
    name: 'American Express',
    icon: '💳',
    pattern: /^3[47][0-9]{13}$/,
  },
  {
    brand: 'discover',
    name: 'Discover',
    icon: '💳',
    pattern: /^6(?:011|5[0-9]{2})[0-9]{12}$/,
  },
];

/**
 * Detect card brand based on card number digits
 */
export function detectCardBrand(cardNumber: string): CardBrandInfo['brand'] {
  const cleanNumber = cardNumber.replace(/\D/g, '');
  if (!cleanNumber) return 'unknown';

  if (cleanNumber.startsWith('4')) return 'visa';
  if (/^(5[1-5]|2[2-7])/.test(cleanNumber)) return 'mastercard';
  if (/^3[47]/.test(cleanNumber)) return 'amex';
  if (/^(6011|65)/.test(cleanNumber)) return 'discover';

  return 'unknown';
}

/**
 * Validate card number using Luhn algorithm
 */
export function validateCardNumber(cardNumber: string): boolean {
  const cleanNumber = cardNumber.replace(/\D/g, '');
  if (cleanNumber.length < 13 || cleanNumber.length > 19) return false;

  let sum = 0;
  let isEven = false;

  for (let i = cleanNumber.length - 1; i >= 0; i--) {
    let digit = parseInt(cleanNumber.charAt(i), 10);

    if (isEven) {
      digit *= 2;
      if (digit > 9) {
        digit -= 9;
      }
    }

    sum += digit;
    isEven = !isEven;
  }

  return sum % 10 === 0;
}

/**
 * Format raw digits into 4-digit grouped card string: "4532 0123 4567 8901"
 */
export function formatCardNumber(value: string): string {
  const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
  const matches = v.match(/\d{4,16}/g);
  const match = (matches && matches[0]) || '';
  const parts = [];

  for (let i = 0, len = match.length; i < len; i += 4) {
    parts.push(match.substring(i, i + 4));
  }

  if (parts.length) {
    return parts.join(' ');
  } else {
    return v;
  }
}

/**
 * Format expiry date into MM/YY
 */
export function formatExpiryDate(value: string): string {
  const clean = value.replace(/\D/g, '').substring(0, 4);
  if (clean.length >= 3) {
    return `${clean.substring(0, 2)}/${clean.substring(2)}`;
  }
  return clean;
}

/**
 * Validate expiry date string "MM/YY"
 */
export function validateExpiryDate(expiry: string): boolean {
  if (!/^\d{2}\/\d{2}$/.test(expiry)) return false;
  const [monthStr, yearStr] = expiry.split('/');
  const month = parseInt(monthStr, 10);
  const year = parseInt(`20${yearStr}`, 10);

  if (month < 1 || month > 12) return false;

  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  if (year < currentYear) return false;
  if (year === currentYear && month < currentMonth) return false;

  return true;
}

/**
 * Validate UPI ID format (e.g., alex@okaxis, john.doe@ybl)
 */
export function validateUpiId(upiId: string): boolean {
  const upiRegex = /^[\w.-]+@[\w.-]+$/;
  return upiRegex.test(upiId.trim());
}

export interface PaymentIntent {
  intentId: string;
  clientSecret: string;
  amount: number;
  currency: string;
  status: 'REQUIRES_ACTION' | 'PROCESSING' | 'SUCCEEDED' | 'FAILED';
  requires3DS: boolean;
  mockOtp: string;
  createdAt: string;
}

/**
 * Mock creation of payment intent
 */
export function createPaymentIntent(amount: number, paymentMethod: string): PaymentIntent {
  const intentId = 'pi_' + Math.random().toString(36).substring(2, 12);
  const clientSecret = 'secret_' + Math.random().toString(36).substring(2, 16);
  const requires3DS = paymentMethod === 'CREDIT_CARD';

  return {
    intentId,
    clientSecret,
    amount,
    currency: 'USD',
    status: requires3DS ? 'REQUIRES_ACTION' : 'SUCCEEDED',
    requires3DS,
    mockOtp: '123456',
    createdAt: new Date().toISOString(),
  };
}

/**
 * Mock OTP verification for 3D Secure authorization
 */
export function verifyPaymentOtp(intentId: string, otp: string): { success: boolean; paymentId?: string; error?: string } {
  if (otp.trim() === '123456') {
    return {
      success: true,
      paymentId: 'pay_' + Math.random().toString(36).substring(2, 12),
    };
  }
  return {
    success: false,
    error: 'Invalid 3D Secure OTP code. Please enter 123456.',
  };
}
