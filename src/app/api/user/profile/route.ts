import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { ApiResponse } from '@/lib/api-response';

export async function GET() {
  try {
    const sessionUser = await getSessionUser();

    if (!sessionUser) {
      return ApiResponse.unauthorized('No active session found.');
    }

    const user = await prisma.user.findUnique({
      where: { id: sessionUser.userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        phone: true,
        homeAddress: true,
        workAddress: true,
        primaryAddressType: true,
        vendorId: true,
        vendor: {
          select: {
            id: true,
            name: true,
            warehouseLocation: true,
          },
        },
        avatar: true,
        createdAt: true,
      },
    });

    if (!user) {
      return ApiResponse.unauthorized('User not found.');
    }

    return ApiResponse.success(user, 'Profile retrieved successfully');
  } catch (error) {
    console.error('Fetch user profile error:', error);
    return ApiResponse.serverError('Failed to fetch user profile.');
  }
}

export async function PUT(request: Request) {
  try {
    const sessionUser = await getSessionUser();

    if (!sessionUser) {
      return ApiResponse.unauthorized('No active session found.');
    }

    const body = await request.json();
    const { name, phone, homeAddress, workAddress, primaryAddressType, vendorName, warehouseLocation } = body;

    // Backend Validation Checks
    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim().length < 2 || name.trim().length > 100) {
        return ApiResponse.badRequest('Full name must be between 2 and 100 characters long.');
      }
    }

    if (phone !== undefined && phone !== null && phone.trim() !== '') {
      const phoneRegex = /^\+?[0-9\s\-\(\)]{7,20}$/;
      if (!phoneRegex.test(phone.trim())) {
        return ApiResponse.badRequest('Please enter a valid phone number (e.g. +1 555-019-2834 or +91 9876543210).');
      }
    }

    if (homeAddress !== undefined && homeAddress !== null && homeAddress.length > 500) {
      return ApiResponse.badRequest('Home address must not exceed 500 characters.');
    }

    if (workAddress !== undefined && workAddress !== null && workAddress.length > 500) {
      return ApiResponse.badRequest('Work address must not exceed 500 characters.');
    }

    if (primaryAddressType !== undefined && primaryAddressType !== null) {
      if (!['HOME', 'WORK'].includes(primaryAddressType)) {
        return ApiResponse.badRequest('Primary address type must be HOME or WORK.');
      }
    }

    const updateData: any = {};
    if (name !== undefined) updateData.name = name.trim();
    if (phone !== undefined) updateData.phone = phone ? phone.trim() : null;
    if (homeAddress !== undefined) updateData.homeAddress = homeAddress ? homeAddress.trim() : null;
    if (workAddress !== undefined) updateData.workAddress = workAddress ? workAddress.trim() : null;
    if (primaryAddressType !== undefined) updateData.primaryAddressType = primaryAddressType;

    const updatedUser = await prisma.user.update({
      where: { id: sessionUser.userId },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        phone: true,
        homeAddress: true,
        workAddress: true,
        primaryAddressType: true,
        vendorId: true,
        vendor: {
          select: {
            id: true,
            name: true,
            warehouseLocation: true,
          },
        },
        avatar: true,
        createdAt: true,
      },
    });

    // If user is a vendor and vendor details were provided, update vendor record
    if (updatedUser.vendorId && (vendorName !== undefined || warehouseLocation !== undefined)) {
      const vendorUpdate: any = {};
      if (vendorName !== undefined) vendorUpdate.name = vendorName;
      if (warehouseLocation !== undefined) vendorUpdate.warehouseLocation = warehouseLocation;

      const updatedVendor = await prisma.vendor.update({
        where: { id: updatedUser.vendorId },
        data: vendorUpdate,
      });

      (updatedUser as any).vendor = {
        id: updatedVendor.id,
        name: updatedVendor.name,
        warehouseLocation: updatedVendor.warehouseLocation,
      };
    }

    return ApiResponse.success(updatedUser, 'Profile updated successfully');
  } catch (error) {
    console.error('Update user profile error:', error);
    return ApiResponse.serverError('Failed to update user profile.');
  }
}
