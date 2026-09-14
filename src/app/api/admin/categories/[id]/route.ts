import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ApiResponse } from '@/lib/api-response';
import { getSessionUser } from '@/lib/auth';

// PUT /api/admin/categories/[id] - Update Category Name & Dynamic Form Fields
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const sessionUser = await getSessionUser();

    if (!sessionUser) {
      return ApiResponse.unauthorized('Authentication required.');
    }

    if (sessionUser.role !== 'ADMIN') {
      return ApiResponse.forbidden('Admin access required.');
    }

    const categoryId = params.id;
    const body = await request.json();
    const { name, fields, parentId } = body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return ApiResponse.badRequest('Category name is required.');
    }

    const trimmedName = name.trim();
    const slug = trimmedName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');

    // Prevent self-referencing parentId
    if (parentId && parentId === categoryId) {
      return ApiResponse.badRequest('A category cannot be its own parent.');
    }

    // Check if another category has the same name/slug
    const existing = await prisma.category.findFirst({
      where: {
        AND: [
          { id: { not: categoryId } },
          { OR: [{ name: trimmedName }, { slug }] },
        ],
      },
    });

    if (existing) {
      return ApiResponse.badRequest('Another category with this name already exists.');
    }

    const updatedCategory = await prisma.category.update({
      where: { id: categoryId },
      data: {
        name: trimmedName,
        slug,
        ...(fields !== undefined && { fields }),
        ...(parentId !== undefined && { parentId: parentId || null }),
      },
      include: {
        parent: { select: { id: true, name: true, slug: true } },
      },
    });

    return ApiResponse.success(updatedCategory, 'Category updated successfully!');
  } catch (error) {
    console.error('Update category error:', error);
    return ApiResponse.serverError('Failed to update category.');
  }
}

// DELETE /api/admin/categories/[id] - Delete Category
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const sessionUser = await getSessionUser();

    if (!sessionUser) {
      return ApiResponse.unauthorized('Authentication required.');
    }

    if (sessionUser.role !== 'ADMIN') {
      return ApiResponse.forbidden('Admin access required.');
    }

    const categoryId = params.id;

    // Check if category has linked products
    const productCount = await prisma.product.count({
      where: { categoryId },
    });

    if (productCount > 0) {
      return ApiResponse.badRequest(
        `Cannot delete category. There are ${productCount} active products assigned to this category.`
      );
    }

    await prisma.category.delete({
      where: { id: categoryId },
    });

    return ApiResponse.success(null, 'Category deleted successfully!');
  } catch (error) {
    console.error('Delete category error:', error);
    return ApiResponse.serverError('Failed to delete category.');
  }
}
