export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { comparePassword, hashPassword } from '@/lib/auth';
import { ApiResponse } from '@/lib/api-response';
import crypto from 'crypto';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, otp } = body;

    if (!email || typeof email !== 'string' || !otp || typeof otp !== 'string') {
      return ApiResponse.badRequest('Email and 6-digit verification code are required.');
    }

    const normalizedEmail = email.trim().toLowerCase();
    const cleanOtp = otp.trim();

    if (cleanOtp.length !== 6 || !/^\d{6}$/.test(cleanOtp)) {
      return ApiResponse.badRequest('Verification code must be a 6-digit number.');
    }

    // Find the latest active unverified token record for this email
    const tokenRecord = await prisma.passwordResetToken.findFirst({
      where: {
        email: normalizedEmail,
        verifiedAt: null,
        usedAt: null,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!tokenRecord) {
      return ApiResponse.badRequest('Invalid or expired verification code. Please request a new code.');
    }

    // Check expiration
    if (tokenRecord.expiresAt < new Date()) {
      return ApiResponse.badRequest('This verification code has expired. Please request a new code.');
    }

    // Check rate limit on attempts (max 5 failed attempts)
    if (tokenRecord.attempts >= 5) {
      return ApiResponse.badRequest('Too many failed attempts. Please request a new verification code.');
    }

    // Verify OTP hash
    const isOtpValid = await comparePassword(cleanOtp, tokenRecord.otpHash);

    if (!isOtpValid) {
      // Increment attempt counter
      await prisma.passwordResetToken.update({
        where: { id: tokenRecord.id },
        data: { attempts: { increment: 1 } },
      });
      return ApiResponse.badRequest('Invalid verification code. Please try again.');
    }

    // OTP is valid! Mark as verified and generate temporary short-lived reset authorization token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenHash = await hashPassword(resetToken);

    await prisma.passwordResetToken.update({
      where: { id: tokenRecord.id },
      data: {
        verifiedAt: new Date(),
        resetTokenHash,
      },
    });

    return ApiResponse.success(
      { resetToken },
      'Verification code verified successfully.'
    );
  } catch (error) {
    console.error('Verify reset code error:', error);
    return ApiResponse.serverError('Failed to verify code. Please try again.');
  }
}
