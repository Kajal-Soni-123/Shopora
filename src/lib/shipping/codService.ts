import { getDeliveryProvider } from './ProviderFactory';
import { CodAvailabilityInput, CodAvailabilityResult } from './types';

const MAX_COD_ORDER_TOTAL = 50000; // ₹50,000 maximum order limit for COD

export async function checkCodAvailability(input: CodAvailabilityInput): Promise<CodAvailabilityResult> {
  const pincode = (input.pincode || '').trim();
  const orderAmount = input.orderAmount || 0;

  // 1. Basic pincode validation
  if (!pincode || pincode.length < 5) {
    return {
      allowed: false,
      reason: 'Please provide a valid shipping pincode.',
      maxAmountLimit: MAX_COD_ORDER_TOTAL,
    };
  }

  // 2. Blacklisted pincodes for COD
  if (pincode === '000000' || pincode === '999999') {
    return {
      allowed: false,
      reason: `Cash on Delivery is unavailable for delivery pincode ${pincode}.`,
      maxAmountLimit: MAX_COD_ORDER_TOTAL,
    };
  }

  // 3. Maximum order total limit check
  if (orderAmount > MAX_COD_ORDER_TOTAL) {
    return {
      allowed: false,
      reason: `Order total (₹${orderAmount.toLocaleString('en-IN')}) exceeds the maximum allowed Cash on Delivery limit of ₹${MAX_COD_ORDER_TOTAL.toLocaleString('en-IN')}.`,
      maxAmountLimit: MAX_COD_ORDER_TOTAL,
    };
  }

  // 4. Delegate to Delivery Provider
  try {
    const provider = getDeliveryProvider();
    const providerResult = await provider.checkCodAvailability(input);
    return providerResult;
  } catch (err: any) {
    console.error('Error checking COD availability from provider:', err);
    return {
      allowed: true, // Default to allowed if provider check passes mock
      maxAmountLimit: MAX_COD_ORDER_TOTAL,
    };
  }
}
