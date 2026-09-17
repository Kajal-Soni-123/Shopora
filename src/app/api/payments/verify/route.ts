import { NextResponse } from 'next/server';
import { ApiResponse } from '@/lib/api-response';
import { verifyPaymentOtp } from '@/lib/paymentGateway';
import { isStripeConfigured, retrieveStripePaymentIntent } from '@/lib/stripe';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { intentId, otp } = body;

    if (!intentId || !otp) {
      return ApiResponse.badRequest('Intent ID and OTP code are required');
    }

    // Check if it's a real Stripe intent ID and Stripe is configured
    if (intentId.startsWith('pi_') && isStripeConfigured()) {
      try {
        const stripeIntent = await retrieveStripePaymentIntent(intentId);
        if (stripeIntent.status === 'succeeded' || stripeIntent.status === 'requires_capture') {
          return ApiResponse.success(
            {
              paymentId: `pay_stripe_${stripeIntent.id}`,
              status: 'PAID',
              provider: 'Stripe API',
              verifiedAt: new Date().toISOString(),
            },
            'Stripe payment verified successfully'
          );
        }
      } catch (err: any) {
        console.warn('Stripe intent lookup fallback:', err?.message);
      }
    }

    // Default simulation verification
    const verification = verifyPaymentOtp(intentId, otp);
    if (!verification.success) {
      return ApiResponse.badRequest(verification.error || 'Payment verification failed');
    }

    return ApiResponse.success(
      {
        paymentId: verification.paymentId,
        status: 'PAID',
        provider: 'Shopora Pay Engine',
        verifiedAt: new Date().toISOString(),
      },
      'Payment verified successfully'
    );
  } catch (error) {
    console.error('Payment verification error:', error);
    return ApiResponse.serverError('Failed to verify payment', error);
  }
}
