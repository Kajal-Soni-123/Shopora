export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { getSessionUser } from '@/lib/auth';
import { ApiResponse } from '@/lib/api-response';
import { isValidTryOnModelUrl, parseFitting, TRY_ON_MODEL_REQUIRED_MESSAGE } from '@/lib/try-on/tryOnModel';

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
    const {
      title,
      description,
      price,
      stock,
      frontImage,
      backImage,
      image,
      images,
      categoryId,
      attributes,
      isTryOnAvailable,
      model3dUrl,
      model3dFitting,
      tryOnCategory,
      tryOnImage,
    } = body;

    const updateData: any = {};

    if (isTryOnAvailable !== undefined) {
      updateData.isTryOnAvailable = Boolean(isTryOnAvailable);
    }
    if (model3dUrl !== undefined) {
      if (model3dUrl && !isValidTryOnModelUrl(model3dUrl)) {
        return ApiResponse.badRequest('The 3D model must be uploaded to Shopora or be an https:// link to a .glb file.');
      }
      updateData.model3dUrl = model3dUrl ? model3dUrl.trim() : null;
    }
    if (model3dFitting !== undefined) {
      updateData.model3dFitting = model3dFitting ? { ...parseFitting(model3dFitting) } : Prisma.DbNull;
    }
    // Only enforce when this request touches try-on, so unrelated updates to older products keep working.
    if (isTryOnAvailable !== undefined || model3dUrl !== undefined) {
      const willBeEnabled = updateData.isTryOnAvailable ?? existingProduct.isTryOnAvailable;
      const willHaveModel = model3dUrl !== undefined ? updateData.model3dUrl : existingProduct.model3dUrl;
      if (willBeEnabled && !willHaveModel) {
        return ApiResponse.badRequest(TRY_ON_MODEL_REQUIRED_MESSAGE);
      }
    }
    if (tryOnCategory !== undefined) {
      updateData.tryOnCategory = tryOnCategory || null;
    }
    if (tryOnImage !== undefined) {
      updateData.tryOnImage = tryOnImage ? tryOnImage.trim() : null;
    }

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

    const finalFrontImage = (frontImage || image || '').trim();
    if (frontImage !== undefined || image !== undefined) {
      if (!finalFrontImage) {
        return ApiResponse.badRequest('Product front image URL is required.');
      }
      updateData.image = finalFrontImage;
    }

    if (backImage !== undefined || images !== undefined) {
      const finalBackImage = (backImage || (Array.isArray(images) && images[0]) || '').trim();
      if (!finalBackImage && backImage !== undefined) {
        return ApiResponse.badRequest('Product back image URL is required.');
      }
      if (Array.isArray(images) || finalBackImage) {
        updateData.images = Array.from(
          new Set(
            [finalBackImage, ...(Array.isArray(images) ? images : [])].filter(
              (url) => typeof url === 'string' && url.trim().length > 0
            )
          )
        );
      }
    }

    if (categoryId !== undefined && typeof categoryId === 'string' && categoryId.length > 0) {
      updateData.categoryId = categoryId;
    }

    if (attributes !== undefined) {
      const existingAttrs = (existingProduct.attributes && typeof existingProduct.attributes === 'object') ? existingProduct.attributes : {};
      updateData.attributes = {
        ...existingAttrs,
        ...(attributes || {}),
        ...(finalFrontImage ? { frontImage: finalFrontImage } : {}),
        ...(backImage ? { backImage } : {}),
      };
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
