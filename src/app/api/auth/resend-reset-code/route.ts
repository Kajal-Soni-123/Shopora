export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword } from '@/lib/auth';
import { ApiResponse } from '@/lib/api-response';
import { sendPasswordResetEmail } from '@/lib/emailService';
import crypto from 'crypto';

const COOLDOWN_SECONDS = 60;
const OTP_EXPIRATION_MINUTES = 10;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email || typeof email !== 'string') {
      return ApiResponse.badRequest('Email address is required.');
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Check rate limit: 60s cooldown since last OTP creation for this email
    const recentToken = await prisma.passwordResetToken.findFirst({
      where: {
        email: normalizedEmail,
        createdAt: {
          gte: new Date(Date.now() - COOLDOWN_SECONDS * 1000),
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (recentToken) {
      return ApiResponse.tooManyRequests(
        `Please wait ${COOLDOWN_SECONDS} seconds before requesting another verification code.`
      );
    }

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (user) {
      // Invalidate previous active OTP tokens
      await prisma.passwordResetToken.updateMany({
        where: {
          email: normalizedEmail,
          usedAt: null,
        },
        data: {
          expiresAt: new Date(),
        },
      });

      // Generate new 6-digit numeric OTP
      const otpCode = crypto.randomInt(100000, 999999).toString();
      const otpHash = await hashPassword(otpCode);
      const expiresAt = new Date(Date.now() + OTP_EXPIRATION_MINUTES * 60 * 1000);

      // Create new token record
      await prisma.passwordResetToken.create({
        data: {
          email: normalizedEmail,
          otpHash,
          expiresAt,
        },
      });

      // Send new OTP email
      await sendPasswordResetEmail({
        email: user.email,
        name: user.name,
        otpCode,
        expiresMinutes: OTP_EXPIRATION_MINUTES,
      });
    }

    return ApiResponse.success(
      { email: normalizedEmail },
      'A new verification code has been sent to your email.'
    );
  } catch (error) {
    console.error('Resend reset code error:', error);
    return ApiResponse.serverError('Failed to resend verification code. Please try again.');
  }
}
