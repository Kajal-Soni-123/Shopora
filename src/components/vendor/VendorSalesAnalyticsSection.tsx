'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import {
  TrendingUp,
  DollarSign,
  ShoppingBag,
  MapPin,
  Award,
  Calendar,
  Package,
  ArrowUpRight,
  Filter,
  BarChart3,
  Globe,
  Loader2,
  RefreshCw,
} from 'lucide-react';

interface MostSoldProductMonthly {
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

interface MonthlySalesSummary {
  monthKey: string;
  monthName: string;
  totalOrders: number;
  totalRevenue: number;
  unitsSold: number;
}

interface StateSalesDistribution {
  stateCode: string;
  stateName: string;
  orderCount: number;
  totalRevenue: number;
  percentage: number;
}

interface ProductSalesSummary {
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

interface SalesStatsData {
  totalRevenue: number;
  totalOrders: number;
  totalUnitsSold: number;
  topState: string;
  mostSoldProductsPerMonth: MostSoldProductMonthly[];
  monthlySales: MonthlySalesSummary[];
  stateDistribution: StateSalesDistribution[];
  productSalesSummaries: ProductSalesSummary[];
}

export default function VendorSalesAnalyticsSection() {
  const [stats, setStats] = useState<SalesStatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState<string>('ALL');

  const fetchSalesStats = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/vendor/sales/stats');
      const data = await res.json();
      if (data.success) {
        setStats(data.data);
      }
    } catch (err) {
      console.error('Error fetching vendor sales stats:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSalesStats();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
        <span className="ml-3 text-sm font-medium text-slate-600">Loading sales analytics & geographic data...</span>
      </div>
    );
  }

  if (!stats || stats.totalOrders === 0) {
    return (
      <div className="bg-white rounded-2xl p-12 text-center border border-slate-200/80 shadow-sm">
        <ShoppingBag className="w-12 h-12 text-slate-300 mx-auto mb-4" />
        <h3 className="text-lg font-bold text-slate-800 mb-1">No Order Sales Analytics Available</h3>
        <p className="text-sm text-slate-500 max-w-md mx-auto mb-6">
          Once customers place orders for your products, detailed monthly sales, top-selling items, and state geographic distributions will appear here.
        </p>
        <button
          onClick={fetchSalesStats}
          className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 transition-colors shadow-sm"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh Sales Data
        </button>
      </div>
    );
  }

  // Filtered Spotlight for Most Sold Product
  const activeMonthlySpotlight =
    selectedMonth === 'ALL'
      ? stats.mostSoldProductsPerMonth[0]
      : stats.mostSoldProductsPerMonth.find((m) => m.monthKey === selectedMonth) || stats.mostSoldProductsPerMonth[0];

  const topSpotlightProduct = activeMonthlySpotlight?.mostSoldProduct;

  return (
    <div className="space-[#1e293b] space-y-8">
      {/* Top Banner & Header */}
      <div className="bg-white rounded-2xl p-6 md:p-8 border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
        <div>
          <div className="inline-flex items-center px-3 py-1 bg-indigo-50 border border-indigo-200 rounded-full text-indigo-700 text-xs font-semibold uppercase tracking-wider mb-3">
            <BarChart3 className="w-3.5 h-3.5 mr-1.5 text-indigo-600" />
            Commercial & Geographic Insights
          </div>
          <h2 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">
            Sales & Orders Analytics
          </h2>
          <p className="text-slate-500 text-xs sm:text-sm mt-1 max-w-2xl font-medium">
            Track monthly revenue performance, top-selling product spotlights, and customer geographic order distribution by state.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchSalesStats}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl transition-all flex items-center shadow-xs"
          >
            <RefreshCw className="w-3.5 h-3.5 mr-2" />
            Sync Real-time
          </button>
        </div>
      </div>

      {/* 4 KPI Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Total Revenue */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:shadow-sm transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Sales Revenue</span>
            <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 mb-1">
            ${stats.totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
          <div className="flex items-center text-xs text-emerald-600 font-medium">
            <TrendingUp className="w-3.5 h-3.5 mr-1" />
            Sub-orders revenue across catalog
          </div>
        </div>

        {/* Total Orders */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:shadow-sm transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Customer Orders</span>
            <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl border border-indigo-100">
              <ShoppingBag className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 mb-1">{stats.totalOrders}</div>
          <div className="flex items-center text-xs text-indigo-600 font-medium">
            <Package className="w-3.5 h-3.5 mr-1" />
            Fulfilled & active sub-orders
          </div>
        </div>

        {/* Total Units Sold */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:shadow-sm transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Product Units Sold</span>
            <div className="p-2.5 bg-sky-50 text-sky-600 rounded-xl border border-sky-100">
              <Package className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 mb-1">{stats.totalUnitsSold}</div>
          <div className="flex items-center text-xs text-sky-600 font-medium">
            <ArrowUpRight className="w-3.5 h-3.5 mr-1" />
            Total items shipped to customers
          </div>
        </div>

        {/* Top Ordering State */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:shadow-sm transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Top Customer Location</span>
            <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl border border-indigo-100">
              <MapPin className="w-5 h-5" />
            </div>
          </div>
          <div className="text-lg font-bold text-slate-900 mb-1 truncate">{stats.topState}</div>
          <div className="flex items-center text-xs text-indigo-600 font-medium">
            <Globe className="w-3.5 h-3.5 mr-1" />
            Highest order volume state
          </div>
        </div>
      </div>

      {/* Most Sold Product Spotlight & Geographic Breakdown Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Spotlight Banner: Most Sold Product per Month */}
        <div className="lg:col-span-7 bg-gradient-to-br from-amber-500/10 via-white to-amber-500/5 rounded-2xl p-6 border border-amber-200 shadow-sm relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <span className="p-2 bg-amber-500 text-white rounded-xl shadow-md">
                <Award className="w-5 h-5" />
              </span>
              <div>
                <h3 className="text-base font-bold text-slate-900">#1 Most Sold Product Spotlight</h3>
                <p className="text-xs text-slate-500">Highest volume product as per customer orders</p>
              </div>
            </div>

            {/* Month Filter Selector */}
            <div className="flex items-center space-x-2 bg-white/80 border border-slate-200 rounded-xl px-3 py-1.5 text-xs">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="bg-transparent text-slate-800 font-semibold focus:outline-none cursor-pointer"
              >
                <option value="ALL">Latest Month ({stats.monthlySales[0]?.monthName})</option>
                {stats.monthlySales.map((m) => (
                  <option key={m.monthKey} value={m.monthKey}>
                    {m.monthName}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {topSpotlightProduct ? (
            <div className="bg-white rounded-xl p-5 border border-amber-100 shadow-sm flex flex-col sm:flex-row items-center gap-5">
              <div className="relative w-28 h-28 rounded-lg overflow-hidden bg-slate-100 border border-slate-200 shrink-0">
                <Image
                  src={topSpotlightProduct.image}
                  alt={topSpotlightProduct.title}
                  fill
                  className="object-cover"
                />
              </div>
              <div className="flex-1 text-center sm:text-left">
                <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 mb-2">
                  🏆 Top Selling in {activeMonthlySpotlight?.monthName}
                </div>
                <h4 className="text-lg font-extrabold text-slate-900 line-clamp-1">{topSpotlightProduct.title}</h4>
                <div className="mt-2 flex flex-wrap items-center justify-center sm:justify-start gap-4 text-xs font-medium text-slate-600">
                  <div className="bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200/60">
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">Units Sold</span>
                    <span className="text-sm font-black text-indigo-600">{topSpotlightProduct.unitsSoldInMonth} units</span>
                  </div>
                  <div className="bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200/60">
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">Monthly Revenue</span>
                    <span className="text-sm font-black text-emerald-600">
                      ${topSpotlightProduct.revenueInMonth.toLocaleString()}
                    </span>
                  </div>
                  <div className="bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200/60">
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">Unit Price</span>
                    <span className="text-sm font-bold text-slate-800">${topSpotlightProduct.price}</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl p-8 text-center border border-slate-200 text-slate-400 text-sm">
              No sales data recorded for the selected month.
            </div>
          )}
        </div>

        {/* Geographic Distribution: Top Ordering States */}
        <div className="lg:col-span-5 bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                <Globe className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Geographic Order Distribution</h3>
                <p className="text-xs text-slate-500">Top ordering states by customer address</p>
              </div>
            </div>
          </div>

          <div className="space-y-3 my-2">
            {stats.stateDistribution.slice(0, 5).map((state, idx) => (
              <div key={state.stateCode} className="bg-slate-50/70 p-3 rounded-xl border border-slate-100">
                <div className="flex items-center justify-between text-xs font-bold text-slate-800 mb-1.5">
                  <span className="flex items-center">
                    <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 text-[10px] font-black flex items-center justify-center mr-2">
                      {idx + 1}
                    </span>
                    {state.stateName} ({state.stateCode})
                  </span>
                  <span className="text-slate-600">
                    {state.orderCount} orders <span className="text-slate-400 font-normal">(${state.totalRevenue.toLocaleString()})</span>
                  </span>
                </div>
                <div className="w-full bg-slate-200/80 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-indigo-600 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${Math.max(state.percentage, 8)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Monthly Sales Trajectory Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Calendar className="w-5 h-5 text-indigo-600" />
            <h3 className="text-base font-bold text-slate-900">Monthly Sales & Orders Summary</h3>
          </div>
          <span className="text-xs font-semibold text-slate-400">June 2026 – September 2026</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-100">
              <tr>
                <th className="px-6 py-3">Month</th>
                <th className="px-6 py-3">Sub-Orders Count</th>
                <th className="px-6 py-3">Units Sold</th>
                <th className="px-6 py-3">Total Sales Revenue</th>
                <th className="px-6 py-3">Avg Order Value</th>
                <th className="px-6 py-3">Top Product in Month</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {stats.monthlySales.map((month) => {
                const monthSpotlight = stats.mostSoldProductsPerMonth.find((m) => m.monthKey === month.monthKey);
                const avgVal = month.totalOrders > 0 ? (month.totalRevenue / month.totalOrders).toFixed(2) : '0';

                return (
                  <tr key={month.monthKey} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-6 py-4 font-bold text-slate-900">{month.monthName}</td>
                    <td className="px-6 py-4 font-semibold text-slate-700">{month.totalOrders} sub-orders</td>
                    <td className="px-6 py-4 font-semibold text-slate-700">{month.unitsSold} units</td>
                    <td className="px-6 py-4 font-black text-emerald-600 text-sm">
                      ${month.totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4 font-semibold text-slate-700">${avgVal}</td>
                    <td className="px-6 py-4">
                      {monthSpotlight?.mostSoldProduct ? (
                        <span className="inline-flex items-center text-xs font-medium text-slate-800 bg-amber-50 text-amber-800 border border-amber-200/60 px-2.5 py-1 rounded-lg">
                          🏆 {monthSpotlight.mostSoldProduct.title} ({monthSpotlight.mostSoldProduct.unitsSoldInMonth} sold)
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Product-Wise Lifetime Sales Breakdown */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Package className="w-5 h-5 text-indigo-600" />
            <h3 className="text-base font-bold text-slate-900">Catalog Product Sales Breakdown</h3>
          </div>
          <span className="text-xs text-slate-500 font-medium">Sorted by highest sales volume</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-100">
              <tr>
                <th className="px-6 py-3">Product</th>
                <th className="px-6 py-3">Price</th>
                <th className="px-6 py-3">Current Stock</th>
                <th className="px-6 py-3">Units Sold</th>
                <th className="px-6 py-3">Total Sales Revenue</th>
                <th className="px-6 py-3">Revenue Share</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {stats.productSalesSummaries.map((prod) => (
                <tr key={prod.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="px-6 py-3.5 flex items-center space-x-3">
                    <div className="relative w-10 h-10 rounded-lg overflow-hidden bg-slate-100 shrink-0 border border-slate-200">
                      <Image src={prod.image} alt={prod.title} fill className="object-cover" />
                    </div>
                    <div>
                      <div className="font-bold text-slate-900 text-sm line-clamp-1">{prod.title}</div>
                      <div className="text-[11px] text-slate-400">ID: {prod.id}</div>
                    </div>
                  </td>
                  <td className="px-6 py-3.5 font-semibold text-slate-800">${prod.price}</td>
                  <td className="px-6 py-3.5 font-medium text-slate-600">{prod.stock} units</td>
                  <td className="px-6 py-3.5 font-black text-indigo-600 text-sm">{prod.totalUnitsSold} units</td>
                  <td className="px-6 py-3.5 font-black text-emerald-600 text-sm">
                    ${prod.totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-6 py-3.5">
                    <div className="w-32">
                      <div className="flex items-center justify-between text-[11px] font-semibold text-slate-600 mb-1">
                        <span>{prod.revenueSharePct}%</span>
                      </div>
                      <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                        <div
                          className="bg-emerald-500 h-1.5 rounded-full"
                          style={{ width: `${prod.revenueSharePct}%` }}
                        />
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
