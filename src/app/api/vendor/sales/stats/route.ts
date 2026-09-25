export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { ApiResponse } from '@/lib/api-response';

export interface MostSoldProductMonthly {
  monthKey: string;
  monthName: string;
  mostSoldProduct: {
    id: string;
    title: string;
    image: string;
    price: number;
    unitsSoldInMonth: number;
    revenueInMonth: number;
  } | null;
}

export interface MonthlySalesSummary {
  monthKey: string;
  monthName: string;
  totalOrders: number;
  totalRevenue: number;
  unitsSold: number;
}

export interface StateSalesDistribution {
  stateCode: string; // e.g. "WA", "TX", "CA"
  stateName: string;
  orderCount: number;
  totalRevenue: number;
  percentage: number;
}

export interface ProductSalesSummary {
  id: string;
  title: string;
  image: string;
  price: number;
  stock: number;
  totalUnitsSold: number;
  totalRevenue: number;
  ordersCount: number;
  revenueSharePct: number;
}

// GET /api/vendor/sales/stats - Sales, top products, and geographic state analytics for vendor
export async function GET() {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser || sessionUser.role !== 'VENDOR' || !sessionUser.vendorId) {
      return ApiResponse.unauthorized('Access denied. Vendor authentication required.');
    }

    // 1. Fetch vendor products
    const vendorProducts = await prisma.product.findMany({
      where: { vendorId: sessionUser.vendorId },
    });

    // 2. Fetch vendor sub-orders
    const subOrders = await prisma.subOrder.findMany({
      where: { vendorId: sessionUser.vendorId },
      include: {
        order: {
          select: {
            id: true,
            orderNumber: true,
            customerName: true,
            customerEmail: true,
            shippingAddress: true,
            paymentStatus: true,
          },
        },
        items: {
          include: {
            product: {
              select: { id: true, title: true, image: true, price: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (subOrders.length === 0) {
      return ApiResponse.success({
        totalRevenue: 0,
        totalOrders: 0,
        totalUnitsSold: 0,
        topState: 'N/A',
        mostSoldProductsPerMonth: [],
        monthlySales: [],
        stateDistribution: [],
        productSalesSummaries: [],
      });
    }

    // 3. Global aggregates
    let totalRevenue = 0;
    let totalUnitsSold = 0;
    const totalOrders = subOrders.length;

    subOrders.forEach((so) => {
      totalRevenue += so.subtotal;
      so.items.forEach((item) => {
        totalUnitsSold += item.quantity;
      });
    });

    totalRevenue = Number(totalRevenue.toFixed(2));

    // 4. State / Geographic Order Distribution (extract state from shippingAddress)
    // Common state mappings for nice display names
    const stateNameMap: { [key: string]: string } = {
      WA: 'Washington',
      OR: 'Oregon',
      CA: 'California',
      TX: 'Texas',
      NY: 'New York',
      IL: 'Illinois',
      FL: 'Florida',
      MA: 'Massachusetts',
      CO: 'Colorado',
      GA: 'Georgia',
      SE: 'Stockholm (SE)',
    };

    const stateCountMap: { [state: string]: { count: number; revenue: number } } = {};

    subOrders.forEach((so) => {
      const addr = so.order?.shippingAddress || '';
      // Address pattern matching state code (e.g. "Seattle, WA 98101" or ", TX ")
      let stateCode = 'Other';
      const match = addr.match(/\b([A-Z]{2})\b\s*\d{5}?/) || addr.match(/,\s*([A-Z]{2})\b/i);
      if (match && match[1]) {
        stateCode = match[1].toUpperCase();
      } else {
        // Fallback checks
        if (addr.includes('WA') || addr.includes('Seattle')) stateCode = 'WA';
        else if (addr.includes('OR') || addr.includes('Portland')) stateCode = 'OR';
        else if (addr.includes('TX') || addr.includes('Austin')) stateCode = 'TX';
        else if (addr.includes('CA') || addr.includes('San Francisco') || addr.includes('Los Angeles')) stateCode = 'CA';
        else if (addr.includes('NY') || addr.includes('New York')) stateCode = 'NY';
      }

      if (!stateCountMap[stateCode]) {
        stateCountMap[stateCode] = { count: 0, revenue: 0 };
      }
      stateCountMap[stateCode].count += 1;
      stateCountMap[stateCode].revenue += so.subtotal;
    });

    const stateDistribution: StateSalesDistribution[] = Object.entries(stateCountMap)
      .map(([code, data]) => ({
        stateCode: code,
        stateName: stateNameMap[code] || code,
        orderCount: data.count,
        totalRevenue: Number(data.revenue.toFixed(2)),
        percentage: Math.round((data.count / totalOrders) * 100),
      }))
      .sort((a, b) => b.orderCount - a.orderCount);

    const topState = stateDistribution.length > 0 ? `${stateDistribution[0].stateName} (${stateDistribution[0].orderCount} orders)` : 'N/A';

    // 5. Monthly Sales & Most Sold Product per Month
    const monthGroups: { [monthKey: string]: typeof subOrders } = {};

    subOrders.forEach((so) => {
      const d = new Date(so.createdAt);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const key = `${year}-${month}`;
      if (!monthGroups[key]) {
        monthGroups[key] = [];
      }
      monthGroups[key].push(so);
    });

    const sortedMonthKeys = Object.keys(monthGroups).sort((a, b) => b.localeCompare(a));

    const mostSoldProductsPerMonth: MostSoldProductMonthly[] = [];
    const monthlySales: MonthlySalesSummary[] = [];

    sortedMonthKeys.forEach((monthKey) => {
      const monthSubOrders = monthGroups[monthKey];
      const [yearStr, monthStr] = monthKey.split('-');
      const dateObj = new Date(parseInt(yearStr, 10), parseInt(monthStr, 10) - 1, 1);
      const monthName = dateObj.toLocaleString('en-US', { month: 'long', year: 'numeric' });

      let mRevenue = 0;
      let mUnits = 0;

      // Product sales map for this month
      const prodMonthSalesMap: {
        [prodId: string]: {
          product: { id: string; title: string; image: string; price: number };
          units: number;
          revenue: number;
        };
      } = {};

      monthSubOrders.forEach((so) => {
        mRevenue += so.subtotal;
        so.items.forEach((item) => {
          mUnits += item.quantity;
          if (!prodMonthSalesMap[item.productId]) {
            prodMonthSalesMap[item.productId] = {
              product: item.product,
              units: 0,
              revenue: 0,
            };
          }
          prodMonthSalesMap[item.productId].units += item.quantity;
          prodMonthSalesMap[item.productId].revenue += item.price * item.quantity;
        });
      });

      monthlySales.push({
        monthKey,
        monthName,
        totalOrders: monthSubOrders.length,
        totalRevenue: Number(mRevenue.toFixed(2)),
        unitsSold: mUnits,
      });

      // Find top sold product in this month
      let topProdEntry: MostSoldProductMonthly['mostSoldProduct'] = null;
      let maxUnits = -1;

      Object.values(prodMonthSalesMap).forEach((data) => {
        if (data.units > maxUnits) {
          maxUnits = data.units;
          topProdEntry = {
            id: data.product.id,
            title: data.product.title,
            image: data.product.image,
            price: data.product.price,
            unitsSoldInMonth: data.units,
            revenueInMonth: Number(data.revenue.toFixed(2)),
          };
        }
      });

      mostSoldProductsPerMonth.push({
        monthKey,
        monthName,
        mostSoldProduct: topProdEntry,
      });
    });

    // 6. Product-wise overall sales summaries
    const productSalesMap: {
      [prodId: string]: {
        units: number;
        revenue: number;
        ordersCount: number;
      };
    } = {};

    subOrders.forEach((so) => {
      so.items.forEach((item) => {
        if (!productSalesMap[item.productId]) {
          productSalesMap[item.productId] = { units: 0, revenue: 0, ordersCount: 0 };
        }
        productSalesMap[item.productId].units += item.quantity;
        productSalesMap[item.productId].revenue += item.price * item.quantity;
        productSalesMap[item.productId].ordersCount += 1;
      });
    });

    const productSalesSummaries: ProductSalesSummary[] = vendorProducts.map((p) => {
      const pSales = productSalesMap[p.id] || { units: 0, revenue: 0, ordersCount: 0 };
      const sharePct = totalRevenue > 0 ? Math.round((pSales.revenue / totalRevenue) * 100) : 0;

      return {
        id: p.id,
        title: p.title,
        image: p.image,
        price: p.price,
        stock: p.stock,
        totalUnitsSold: pSales.units,
        totalRevenue: Number(pSales.revenue.toFixed(2)),
        ordersCount: pSales.ordersCount,
        revenueSharePct: sharePct,
      };
    }).sort((a, b) => b.totalUnitsSold - a.totalUnitsSold);

    return ApiResponse.success({
      totalRevenue,
      totalOrders,
      totalUnitsSold,
      topState,
      mostSoldProductsPerMonth,
      monthlySales,
      stateDistribution,
      productSalesSummaries,
    });
  } catch (error) {
    console.error('Fetch vendor sales stats error:', error);
    return ApiResponse.serverError('Failed to calculate vendor sales statistics.');
  }
}
