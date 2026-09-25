export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { ApiResponse } from '@/lib/api-response';
import { getSessionUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getDeliveryProvider } from '@/lib/shipping/ProviderFactory';

export async function POST(
  req: NextRequest,
  { params }: { params: { shipmentId: string } }
) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return ApiResponse.unauthorized('Authentication required to generate shipping label');
    }

    const { shipmentId } = params;
    const shipment = await prisma.shipment.findUnique({
      where: { id: shipmentId },
      include: {
        fulfillment: true,
      },
    });

    if (!shipment) {
      return ApiResponse.notFound('Shipment not found');
    }

    if (user.role === 'VENDOR' && user.vendorId !== shipment.fulfillment.vendorId) {
      return ApiResponse.forbidden('Access denied: You cannot generate label for another vendor shipment');
    }

    const provider = getDeliveryProvider(shipment.provider);
    const labelResult = await provider.generateLabel(shipment.id, shipment.awbNumber || 'AWB-UNKNOWN');

    // Update Shipment labelUrl & status if CREATED
    const nextStatus = shipment.status === 'CREATED' ? 'LABEL_GENERATED' : shipment.status;

    const updatedShipment = await prisma.$transaction(async (tx) => {
      const updated = await tx.shipment.update({
        where: { id: shipment.id },
        data: {
          labelUrl: labelResult.labelUrl,
          status: nextStatus,
        },
      });

      if (shipment.status === 'CREATED') {
        await tx.trackingEvent.create({
          data: {
            shipmentId: shipment.id,
            status: 'LABEL_GENERATED',
            description: 'Shipping label generated for courier pickup',
            eventTime: new Date(),
            providerEvent: 'LABEL_PRINTED',
          },
        });
      }

      return updated;
    });

    return ApiResponse.success(
      {
        shipmentId: updatedShipment.id,
        labelUrl: updatedShipment.labelUrl,
        awbNumber: updatedShipment.awbNumber,
        status: updatedShipment.status,
      },
      'Shipping label generated successfully'
    );
  } catch (err: any) {
    console.error('Error generating shipping label:', err);
    return ApiResponse.serverError('Failed to generate shipping label', err.message);
  }
}

// GET handler to serve simulated label payload or redirect
export async function GET(
  req: NextRequest,
  { params }: { params: { shipmentId: string } }
) {
  const { searchParams } = new URL(req.url);
  const raw = searchParams.get('raw');

  const shipment = await prisma.shipment.findUnique({
    where: { id: params.shipmentId },
    include: { fulfillment: { include: { order: true, vendor: true } } },
  });

  if (!shipment) {
    return ApiResponse.notFound('Shipment not found');
  }

  if (raw === 'true') {
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Shipping Label - ${shipment.awbNumber}</title>
        <style>
          body { font-family: sans-serif; padding: 20px; background: #f8fafc; }
          .label { max-width: 450px; background: white; border: 2px solid #000; padding: 20px; margin: auto; }
          .header { border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center; }
          .title { font-size: 20px; font-weight: bold; }
          .awb { font-size: 16px; font-weight: bold; background: #000; color: white; padding: 4px 8px; border-radius: 4px; }
          .barcode { margin: 15px 0; text-align: center; border: 1px dashed #666; padding: 10px; font-family: monospace; font-size: 18px; letter-spacing: 4px; background: #eee; }
          .section { font-size: 12px; margin-bottom: 10px; }
          .footer { border-top: 1px solid #ccc; pt-2; text-align: center; font-size: 10px; color: #666; margin-top: 15px; }
        </style>
      </head>
      <body>
        <div class="label">
          <div class="header">
            <div class="title">SHOPORA LOGISTICS</div>
            <div class="awb">${shipment.provider.toUpperCase()}</div>
          </div>
          <div class="section">
            <strong>SHIP TO:</strong><br>
            ${shipment.fulfillment.order.customerName}<br>
            ${shipment.fulfillment.order.shippingAddress}<br>
            Phone: ${shipment.fulfillment.order.customerPhone || 'N/A'}
          </div>
          <div class="section">
            <strong>SHIP FROM:</strong><br>
            ${shipment.fulfillment.vendor.name}<br>
            ${shipment.fulfillment.vendor.warehouseLocation}<br>
          </div>
          <div class="barcode">
            ||||||| | ||||| |||||| | |||||||<br>
            ${shipment.awbNumber || 'AWB-100200300'}
          </div>
          <div class="section">
            <strong>ORDER #:</strong> ${shipment.fulfillment.subOrderNumber} | 
            <strong>WEIGHT:</strong> ${shipment.weight} KG
          </div>
          <div class="footer">
            Printed via Shopora Unified Delivery Management System
          </div>
        </div>
      </body>
      </html>
    `;
    return new NextResponse(htmlContent, {
      headers: { 'Content-Type': 'text/html' },
    });
  }

  return ApiResponse.success({ labelUrl: shipment.labelUrl || `/api/shipments/${shipment.id}/label?raw=true` });
}
