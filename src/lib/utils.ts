/**
 * Centralized Utility Functions
 */

/**
 * Format currency amount cleanly using standard Intl formatter
 */
export function formatCurrency(amount: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Format date strings to a readable format
 */
export function formatDate(dateInput: string | Date | number): string {
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return 'N/A';

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

/**
 * Generate a vendor-specific tracking number
 */
export function generateTrackingNumber(vendorName: string): string {
  const prefix = vendorName
    ? vendorName.replace(/[^a-zA-Z]/g, '').substring(0, 3).toUpperCase()
    : 'TRK';
  const randomNum = Math.floor(10000 + Math.random() * 90000);
  return `TRK-${prefix}-${randomNum}`;
}

/**
 * Reusable helper to group items by a vendor key (or any string key)
 */
export function groupItemsByVendor<T>(
  items: T[],
  getVendorId: (item: T) => string
): Record<string, T[]> {
  return items.reduce((acc, item) => {
    const key = getVendorId(item) || 'default';
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(item);
    return acc;
  }, {} as Record<string, T[]>);
}

/**
 * Calculate cart order totals (subtotal, tax, shipping, total)
 */
export function calculateOrderTotals(
  items: Array<{ price?: number; product?: { price: number }; quantity: number }>,
  taxRate = 0.08,
  flatShipping = 9.99
) {
  const subtotal = items.reduce((sum, item) => {
    const price = item.price ?? item.product?.price ?? 0;
    return sum + price * item.quantity;
  }, 0);

  const tax = subtotal * taxRate;
  const shipping = subtotal > 0 ? flatShipping : 0;
  const total = subtotal + tax + shipping;

  return {
    subtotal,
    tax,
    shipping,
    total,
  };
}

/**
 * Dynamic class merger helper
 */
export function cn(...classes: (string | boolean | null | undefined)[]): string {
  return classes.filter(Boolean).join(' ');
}
