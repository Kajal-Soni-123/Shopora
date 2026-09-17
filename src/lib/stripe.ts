import Stripe from 'stripe';

let stripeInstance: Stripe | null = null;

/**
 * Check if a valid, non-placeholder Stripe Secret Key is configured in environment
 */
export function isStripeConfigured(): boolean {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  return Boolean(
    secretKey &&
      secretKey.startsWith('sk_') &&
      !secretKey.includes('sample_stripe_secret_key')
  );
}

/**
 * Get lazy-initialized Stripe SDK client instance
 */
export function getStripeClient(): Stripe {
  if (!stripeInstance) {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) {
      throw new Error('STRIPE_SECRET_KEY is missing in environment variables.');
    }
    stripeInstance = new Stripe(secretKey, {
      apiVersion: '2023-10-16' as Stripe.LatestApiVersion,
      appInfo: {
        name: 'Shopora E-Commerce Marketplace',
        version: '1.0.0',
      },
    });
  }
  return stripeInstance;
}

export interface StripeIntentResult {
  intentId: string;
  clientSecret: string;
  amount: number;
  currency: string;
  status: string;
  requires3DS: boolean;
}

/**
 * Create a Stripe PaymentIntent using official Stripe API
 */
export async function createStripePaymentIntent(
  amountInCents: number,
  currency: string = 'usd',
  metadata: Record<string, string> = {}
): Promise<StripeIntentResult> {
  const stripe = getStripeClient();

  const paymentIntent = await stripe.paymentIntents.create({
    amount: Math.round(amountInCents),
    currency: currency.toLowerCase(),
    automatic_payment_methods: {
      enabled: true,
    },
    metadata: {
      platform: 'Shopora Global Marketplace',
      ...metadata,
    },
  });

  return {
    intentId: paymentIntent.id,
    clientSecret: paymentIntent.client_secret || '',
    amount: paymentIntent.amount,
    currency: paymentIntent.currency,
    status: paymentIntent.status,
    requires3DS: paymentIntent.status === 'requires_action',
  };
}

/**
 * Retrieve & check status of an existing Stripe PaymentIntent
 */
export async function retrieveStripePaymentIntent(intentId: string): Promise<Stripe.PaymentIntent> {
  const stripe = getStripeClient();
  return await stripe.paymentIntents.retrieve(intentId);
}
