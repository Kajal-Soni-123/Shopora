import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { ApiResponse } from '@/lib/api-response';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// PUT /api/vendor/products/[id] - Update product details or stock for vendor
export async function PUT(request: Request, { params }: RouteParams) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser || sessionUser.role !== 'VENDOR' || !sessionUser.vendorId) {
      return ApiResponse.unauthorized('Access denied. Merchant Partner authentication required.');
    }

    const { id: productId } = await params;

    // Check product existence and ownership
    const existingProduct = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!existingProduct) {
      return ApiResponse.notFound('Product not found.');
    }

    if (existingProduct.vendorId !== sessionUser.vendorId) {
      return ApiResponse.forbidden('Access denied. You do not own this product.');
    }

    const body = await request.json();
    const { title, description, price, stock, image, images, categoryId, attributes } = body;

    const updateData: any = {};

    if (title !== undefined) {
      if (typeof title !== 'string' || title.trim().length === 0) {
        return ApiResponse.badRequest('Product title cannot be empty.');
      }
      updateData.title = title.trim();
    }

    if (description !== undefined) {
      if (typeof description !== 'string' || description.trim().length === 0) {
        return ApiResponse.badRequest('Product description cannot be empty.');
      }
      updateData.description = description.trim();
    }

    if (price !== undefined) {
      if (typeof price !== 'number' || price <= 0) {
        return ApiResponse.badRequest('A valid positive price is required.');
      }
      updateData.price = price;
    }

    if (stock !== undefined) {
      if (typeof stock !== 'number' || stock < 0 || !Number.isInteger(stock)) {
        return ApiResponse.badRequest('Stock quantity must be a non-negative integer.');
      }
      updateData.stock = stock;
    }

    if (image !== undefined) {
      if (typeof image !== 'string' || image.trim().length === 0) {
        return ApiResponse.badRequest('Product cover image URL is required.');
      }
      updateData.image = image;
    }

    if (images !== undefined && Array.isArray(images)) {
      updateData.images = images;
    }

    if (categoryId !== undefined && typeof categoryId === 'string' && categoryId.length > 0) {
      updateData.categoryId = categoryId;
    }

    if (attributes !== undefined) {
      updateData.attributes = attributes;
    }

    const updatedProduct = await prisma.product.update({
      where: { id: productId },
      data: updateData,
      include: {
        category: true,
        vendor: true,
      },
    });

    return ApiResponse.success(updatedProduct, 'Product updated successfully!');
  } catch (error) {
    console.error('Update vendor product error:', error);
    return ApiResponse.serverError('Failed to update product. Please try again.');
  }
}

// DELETE /api/vendor/products/[id] - Delete a product owned by vendor
export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser || sessionUser.role !== 'VENDOR' || !sessionUser.vendorId) {
      return ApiResponse.unauthorized('Access denied. Merchant Partner authentication required.');
    }

    const { id: productId } = await params;

    // Check product existence and ownership
    const existingProduct = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!existingProduct) {
      return ApiResponse.notFound('Product not found.');
    }

    if (existingProduct.vendorId !== sessionUser.vendorId) {
      return ApiResponse.forbidden('Access denied. You do not own this product.');
    }

    try {
      await prisma.product.delete({
        where: { id: productId },
      });
    } catch (dbError: any) {
      if (dbError.code === 'P2003') {
        return ApiResponse.badRequest(
          'Cannot delete this product because it is associated with existing customer orders. You can set its stock to 0 instead.'
        );
      }
      throw dbError;
    }

    return ApiResponse.success(null, 'Product deleted successfully!');
  } catch (error) {
    console.error('Delete vendor product error:', error);
    return ApiResponse.serverError('Failed to delete product. Please try again.');
  }
}
