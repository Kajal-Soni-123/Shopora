export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { comparePassword, hashPassword } from '@/lib/auth';
import { ApiResponse } from '@/lib/api-response';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { resetToken, newPassword, confirmPassword } = body;

    if (!resetToken || typeof resetToken !== 'string') {
      return ApiResponse.badRequest('Reset token is required. Please restart the password reset process.');
    }

    if (!newPassword || typeof newPassword !== 'string') {
      return ApiResponse.badRequest('New password is required.');
    }

    if (newPassword.length < 8) {
      return ApiResponse.badRequest('Password must be at least 8 characters long.');
    }

    if (!confirmPassword || typeof confirmPassword !== 'string') {
      return ApiResponse.badRequest('Please confirm your new password.');
    }

    if (newPassword !== confirmPassword) {
      return ApiResponse.badRequest('Passwords do not match.');
    }

    // Find all verified, unused password reset tokens verified in the last 15 minutes
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
    const verifiedTokens = await prisma.passwordResetToken.findMany({
      where: {
        verifiedAt: {
          gte: fifteenMinutesAgo,
        },
        usedAt: null,
      },
      orderBy: { createdAt: 'desc' },
    });

    let matchedTokenRecord = null;
    for (const record of verifiedTokens) {
      if (record.resetTokenHash) {
        const isMatch = await comparePassword(resetToken, record.resetTokenHash);
        if (isMatch) {
          matchedTokenRecord = record;
          break;
        }
      }
    }

    if (!matchedTokenRecord) {
      return ApiResponse.badRequest(
        'Invalid or expired password reset session. Please request a new verification code.'
      );
    }

    // Find user associated with token email
    const user = await prisma.user.findUnique({
      where: { email: matchedTokenRecord.email },
    });

    if (!user) {
      return ApiResponse.badRequest('Associated user account was not found.');
    }

    // Hash the new password
    const hashedPassword = await hashPassword(newPassword);

    // Update user's password in database
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    });

    // Mark the reset token as consumed/used
    await prisma.passwordResetToken.update({
      where: { id: matchedTokenRecord.id },
      data: { usedAt: new Date() },
    });

    // Invalidate any remaining open tokens for this email
    await prisma.passwordResetToken.updateMany({
      where: {
        email: matchedTokenRecord.email,
        usedAt: null,
      },
      data: {
        expiresAt: new Date(),
      },
    });

    return ApiResponse.success(
      null,
      'Your password has been reset successfully. You can now log in with your new password.'
    );
  } catch (error) {
    console.error('Reset password error:', error);
    return ApiResponse.serverError('Failed to reset password. Please try again.');
  }
}
