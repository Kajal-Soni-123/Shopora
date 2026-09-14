import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ApiResponse } from '@/lib/api-response';
import { getSessionUser } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const categories = await prisma.category.findMany({
      include: {
        parent: {
          select: { id: true, name: true, slug: true },
        },
        children: {
          select: { id: true, name: true, slug: true },
        },
        _count: {
          select: { products: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    return ApiResponse.success(categories, 'Categories retrieved successfully.');
  } catch (error) {
    console.error('Categories retrieval error:', error);
    return ApiResponse.serverError('Failed to fetch categories.');
  }
}

export async function POST(request: Request) {
  try {
    const sessionUser = await getSessionUser();

    if (!sessionUser) {
      return ApiResponse.unauthorized('Authentication required.');
    }

    if (sessionUser.role !== 'ADMIN') {
      return ApiResponse.forbidden('Admin access required.');
    }

    const body = await request.json();
    const { name, fields = [], parentId = null } = body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return ApiResponse.badRequest('Category name is required.');
    }

    const trimmedName = name.trim();
    const slug = trimmedName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');

    // Check if category already exists
    const existing = await prisma.category.findFirst({
      where: {
        OR: [{ name: trimmedName }, { slug }],
      },
    });

    if (existing) {
      return ApiResponse.badRequest('A category with this name already exists.');
    }

    const category = await prisma.category.create({
      data: {
        name: trimmedName,
        slug,
        fields,
        parentId: parentId || null,
      },
      include: {
        parent: { select: { id: true, name: true, slug: true } },
      },
    });

    return ApiResponse.created(category, 'Category and dynamic form fields created successfully!');
  } catch (error) {
    console.error('Create category error:', error);
    return ApiResponse.serverError('Failed to create category.');
  }
}
