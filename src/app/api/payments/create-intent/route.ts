export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { ApiResponse } from '@/lib/api-response';
import { createPaymentIntent, validateCardNumber, validateUpiId } from '@/lib/paymentGateway';
import { isStripeConfigured, createStripePaymentIntent } from '@/lib/stripe';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { amount, paymentMethod, cardDetails, upiDetails } = body;

    if (!amount || amount <= 0) {
      return ApiResponse.badRequest('Invalid payment amount');
    }

    if (paymentMethod === 'CREDIT_CARD' && cardDetails) {
      const cardNumber = cardDetails.number || cardDetails.cardNumber;
      const { expiry, cvv } = cardDetails;
      if (!cardNumber || !validateCardNumber(cardNumber)) {
        return ApiResponse.badRequest('Invalid card number format or failed Luhn check');
      }
      if (!expiry || !cvv) {
        return ApiResponse.badRequest('Expiry date and CVV are required');
      }
    }

    if (paymentMethod === 'UPI' && upiDetails) {
      const { upiId } = upiDetails;
      if (upiId && !validateUpiId(upiId)) {
        return ApiResponse.badRequest('Invalid UPI ID format (expected user@bank)');
      }
    }

    // Check if Stripe API keys are configured in environment
    if (isStripeConfigured()) {
      try {
        const stripeIntent = await createStripePaymentIntent(
          amount * 100, // Stripe expects amount in cents
          'usd',
          { paymentMethod: paymentMethod || 'CREDIT_CARD' }
        );
        return ApiResponse.success(
          {
            ...stripeIntent,
            provider: 'Stripe Live/Test API',
            mockOtp: '123456',
          },
          'Stripe PaymentIntent created successfully'
        );
      } catch (stripeErr: any) {
        console.warn('Stripe API call failed, falling back to gateway engine:', stripeErr?.message);
      }
    }

    // Fallback to built-in simulation engine
    const intent = createPaymentIntent(amount, paymentMethod);
    return ApiResponse.success(
      {
        ...intent,
        provider: 'Shopora Gateway Simulation Engine',
      },
      'Payment intent created successfully'
    );
  } catch (error) {
    console.error('Payment intent creation error:', error);
    return ApiResponse.serverError('Failed to initialize payment intent', error);
  }
}
