import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword } from '@/lib/auth';
import { ApiResponse } from '@/lib/api-response';
import { sendPasswordResetEmail } from '@/lib/emailService';
import crypto from 'crypto';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
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

    if (!EMAIL_REGEX.test(normalizedEmail)) {
      return ApiResponse.badRequest('Please enter a valid email address.');
    }

    // Rate limiting: Check if an OTP request was made for this email in the last 60 seconds
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

    // Check if user exists in DB
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (user) {
      // Expire any existing active OTP tokens for this email
      await prisma.passwordResetToken.updateMany({
        where: {
          email: normalizedEmail,
          usedAt: null,
        },
        data: {
          expiresAt: new Date(),
        },
      });

      // Generate 6-digit numeric OTP
      const otpCode = crypto.randomInt(100000, 999999).toString();
      const otpHash = await hashPassword(otpCode);
      const expiresAt = new Date(Date.now() + OTP_EXPIRATION_MINUTES * 60 * 1000);

      // Store in DB
      await prisma.passwordResetToken.create({
        data: {
          email: normalizedEmail,
          otpHash,
          expiresAt,
        },
      });

      // Send email
      await sendPasswordResetEmail({
        email: user.email,
        name: user.name,
        otpCode,
        expiresMinutes: OTP_EXPIRATION_MINUTES,
      });
    }

    // Return generic response to prevent user enumeration
    return ApiResponse.success(
      { email: normalizedEmail },
      'If an account exists with this email, a 6-digit verification code has been sent.'
    );
  } catch (error) {
    console.error('Forgot password error:', error);
    return ApiResponse.serverError('Failed to process password reset request. Please try again.');
  }
}
