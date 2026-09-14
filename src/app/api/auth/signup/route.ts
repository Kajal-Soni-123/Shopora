import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword, signToken, setAuthCookie } from '@/lib/auth';
import { ApiResponse } from '@/lib/api-response';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, email, password, role = 'CUSTOMER', storeName, warehouseLocation } = body;

    // Input Validation
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return ApiResponse.badRequest('Name is required.');
    }
    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return ApiResponse.badRequest('A valid email address is required.');
    }
    if (!password || typeof password !== 'string' || password.length < 6) {
      return ApiResponse.badRequest('Password must be at least 6 characters long.');
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      return ApiResponse.badRequest('An account with this email already exists.');
    }

    const hashedPassword = await hashPassword(password);
    let createdVendorId: string | null = null;

    // Handle Vendor registration
    if (role === 'VENDOR') {
      if (!storeName || typeof storeName !== 'string' || storeName.trim().length === 0) {
        return ApiResponse.badRequest('Store Name / Business Name is required for Vendor registration.');
      }
      const vendorLocation = warehouseLocation && typeof warehouseLocation === 'string' && warehouseLocation.trim().length > 0
        ? warehouseLocation.trim()
        : 'Central Fulfillment Hub';

      const vendor = await prisma.vendor.create({
        data: {
          name: storeName.trim(),
          email: normalizedEmail,
          warehouseLocation: vendorLocation,
          rating: 4.9,
        },
      });

      createdVendorId = vendor.id;
    }

    // Create user record
    const user = await prisma.user.create({
      data: {
        name: name.trim(),
        email: normalizedEmail,
        password: hashedPassword,
        role: role === 'VENDOR' ? 'VENDOR' : 'CUSTOMER',
        ...(createdVendorId ? { vendor: { connect: { id: createdVendorId } } } : {}),
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        avatar: true,
        vendorId: true,
        createdAt: true,
      },
    });

    // Create session token & set cookie
    const token = await signToken({
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      vendorId: user.vendorId,
    });

    const response = ApiResponse.created(user, 'Account created successfully!');
    setAuthCookie(response, token);

    return response;
  } catch (error) {
    console.error('Signup error:', error);
    return ApiResponse.serverError('Failed to create account. Please try again.');
  }
}
