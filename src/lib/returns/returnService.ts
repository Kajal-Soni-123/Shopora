export const RETURN_WINDOW_DAYS = 7;

export interface ReturnEligibilityResult {
  eligible: boolean;
  reason?: string;
  maxReturnableQuantity: number;
  returnWindowDays: number;
}

export function checkReturnEligibility(
  orderItem: {
    id: string;
    quantity: number;
    price: number;
    status: string;
    returnItems?: { quantity: number }[];
  },
  subOrder: {
    status: string;
    updatedAt?: Date | string;
    createdAt?: Date | string;
    shipments?: { deliveredAt?: Date | string | null }[];
  }
): ReturnEligibilityResult {
  // 1. SubOrder must be DELIVERED
  if ((subOrder.status || '').toUpperCase() !== 'DELIVERED') {
    return {
      eligible: false,
      reason: 'Product return is only allowed after the package has been delivered.',
      maxReturnableQuantity: 0,
      returnWindowDays: RETURN_WINDOW_DAYS,
    };
  }

  // 2. OrderItem status check
  if ((orderItem.status || '').toUpperCase() === 'CANCELLED') {
    return {
      eligible: false,
      reason: 'Cancelled items cannot be returned.',
      maxReturnableQuantity: 0,
      returnWindowDays: RETURN_WINDOW_DAYS,
    };
  }

  // 3. Check Return Window Expiry (7 days from delivery date or subOrder update date)
  const deliveryDate =
    subOrder.shipments?.[0]?.deliveredAt
      ? new Date(subOrder.shipments[0].deliveredAt)
      : subOrder.updatedAt
      ? new Date(subOrder.updatedAt)
      : new Date();

  const now = new Date();
  const diffDays = Math.floor((now.getTime() - deliveryDate.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays > RETURN_WINDOW_DAYS) {
    return {
      eligible: false,
      reason: `The return window of ${RETURN_WINDOW_DAYS} days has expired (${diffDays} days since delivery).`,
      maxReturnableQuantity: 0,
      returnWindowDays: RETURN_WINDOW_DAYS,
    };
  }

  // 4. Check already returned quantity
  const alreadyReturnedQty = (orderItem.returnItems || []).reduce(
    (acc, ri) => acc + (ri.quantity || 0),
    0
  );
  const maxReturnable = Math.max(0, orderItem.quantity - alreadyReturnedQty);

  if (maxReturnable <= 0) {
    return {
      eligible: false,
      reason: 'This item has already been fully returned.',
      maxReturnableQuantity: 0,
      returnWindowDays: RETURN_WINDOW_DAYS,
    };
  }

  return {
    eligible: true,
    maxReturnableQuantity: maxReturnable,
    returnWindowDays: RETURN_WINDOW_DAYS,
  };
}

export function calculateItemRefundAmount(
  unitPrice: number,
  quantityToReturn: number
): number {
  return Number((unitPrice * quantityToReturn).toFixed(2));
}
