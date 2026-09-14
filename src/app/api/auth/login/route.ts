import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { comparePassword, signToken, setAuthCookie } from '@/lib/auth';
import { ApiResponse } from '@/lib/api-response';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || typeof email !== 'string' || !password || typeof password !== 'string') {
      return ApiResponse.badRequest('Email and password are required.');
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      include: {
        vendor: true,
      },
    });

    if (!user) {
      return ApiResponse.unauthorized('Invalid email or password.');
    }

    // Verify password
    const isPasswordValid = await comparePassword(password, user.password);
    if (!isPasswordValid) {
      return ApiResponse.unauthorized('Invalid email or password.');
    }

    // Generate JWT token & set cookie
    const token = await signToken({
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      vendorId: user.vendorId,
    });

    const sanitizedUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      vendorId: user.vendorId,
      vendor: user.vendor ? {
        id: user.vendor.id,
        name: user.vendor.name,
        warehouseLocation: user.vendor.warehouseLocation,
      } : null,
      avatar: user.avatar,
      createdAt: user.createdAt,
    };

    const response = ApiResponse.success(sanitizedUser, 'Logged in successfully!');
    setAuthCookie(response, token);

    return response;
  } catch (error) {
    console.error('Login error:', error);
    return ApiResponse.serverError('Failed to sign in. Please try again.');
  }
}
