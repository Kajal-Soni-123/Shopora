'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import {
  Star,
  Trophy,
  MessageSquare,
  TrendingUp,
  Filter,
  Calendar,
  Sparkles,
  Package,
  ThumbsUp,
  Search,
  Loader2,
  ChevronRight,
  BarChart3,
  Award,
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface ReviewItem {
  id: string;
  rating: number;
  comment: string;
  createdAt: string;
  user: {
    id: string;
    name: string;
    email: string;
    avatar?: string | null;
  };
  product: {
    id: string;
    title: string;
    image: string;
    price: number;
    rating: number;
    category?: { name: string };
  };
}

interface BestProductMonthly {
  monthKey: string;
  monthName: string;
  bestProduct: {
    id: string;
    title: string;
    image: string;
    price: number;
    monthlyAvgRating: number;
    monthlyReviewCount: number;
    fiveStarCount: number;
  } | null;
}

interface MonthlyStatSummary {
  monthKey: string;
  monthName: string;
  totalReviews: number;
  avgRating: number;
  ratingsBreakdown: { 5: number; 4: number; 3: number; 2: number; 1: number };
}

interface ProductSummary {
  id: string;
  title: string;
  image: string;
  price: number;
  stock: number;
  category: string;
  totalReviews: number;
  avgRating: number;
  fiveStarPct: number;
  latestComment: string;
}

interface VendorReviewStatsData {
  totalReviews: number;
  overallAvgRating: number;
  ratingDistribution: { 5: number; 4: number; 3: number; 2: number; 1: number };
  bestProductsPerMonth: BestProductMonthly[];
  monthlyStats: MonthlyStatSummary[];
  productSummaries: ProductSummary[];
}

export function VendorReviewsSection() {
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [stats, setStats] = useState<VendorReviewStatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedProductFilter, setSelectedProductFilter] = useState<string>('all');
  const [selectedRatingFilter, setSelectedRatingFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedMonthTab, setSelectedMonthTab] = useState<string>('');

  const fetchReviewsAndStats = async () => {
    try {
      setLoading(true);
      const [resReviews, resStats] = await Promise.all([
        fetch('/api/vendor/reviews'),
        fetch('/api/vendor/reviews/stats'),
      ]);

      if (resReviews.ok) {
        const dataR = await resReviews.json();
        setReviews(dataR.data || []);
      }
      if (resStats.ok) {
        const dataS = await resStats.json();
        setStats(dataS.data || null);
        if (dataS.data?.bestProductsPerMonth?.length > 0) {
          setSelectedMonthTab(dataS.data.bestProductsPerMonth[0].monthKey);
        }
      }
    } catch (err) {
      console.error('Error loading vendor reviews data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReviewsAndStats();
  }, []);

  // Filter reviews client-side based on user selection
  const filteredReviews = reviews.filter((r) => {
    if (selectedProductFilter !== 'all' && r.product.id !== selectedProductFilter) return false;
    if (selectedRatingFilter !== 'all' && r.rating !== parseInt(selectedRatingFilter, 10)) return false;
    if (searchQuery.trim().length > 0) {
      const q = searchQuery.toLowerCase();
      const matchComment = r.comment.toLowerCase().includes(q);
      const matchProduct = r.product.title.toLowerCase().includes(q);
      const matchUser = r.user.name.toLowerCase().includes(q);
      if (!matchComment && !matchProduct && !matchUser) return false;
    }
    return true;
  });

  if (loading) {
    return (
      <div className="bg-white rounded-3xl p-12 text-center text-slate-500 border border-slate-200">
        <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3 text-indigo-600" />
        <p className="text-sm font-bold text-slate-700">Loading Customer Reviews & Monthly Statistics...</p>
      </div>
    );
  }

  const currentMonthBest = stats?.bestProductsPerMonth.find((m) => m.monthKey === selectedMonthTab) || stats?.bestProductsPerMonth[0];

  return (
    <div className="space-y-8">
      {/* 1. Key Metrics Overview Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Total Customer Reviews</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-3xl font-extrabold text-slate-900">{stats?.totalReviews || 0}</span>
              <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                +100% verified
              </span>
            </div>
          </div>
          <div className="p-3.5 rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-100">
            <MessageSquare className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Store Average Rating</span>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-3xl font-extrabold text-slate-900">{stats?.overallAvgRating || '0.0'}</span>
              <div className="flex items-center text-amber-400">
                <Star className="w-5 h-5 fill-amber-400" />
              </div>
            </div>
          </div>
          <div className="p-3.5 rounded-2xl bg-amber-50 text-amber-600 border border-amber-100">
            <Star className="w-6 h-6 fill-amber-500" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">5-Star Feedback Ratio</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-3xl font-extrabold text-slate-900">
                {stats?.totalReviews
                  ? Math.round(((stats.ratingDistribution[5] || 0) / stats.totalReviews) * 100)
                  : 0}
                %
              </span>
            </div>
          </div>
          <div className="p-3.5 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100">
            <ThumbsUp className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Reviewed Catalog Items</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-3xl font-extrabold text-slate-900">{stats?.productSummaries.length || 0}</span>
              <span className="text-xs text-slate-500 font-medium">products</span>
            </div>
          </div>
          <div className="p-3.5 rounded-2xl bg-sky-50 text-sky-600 border border-sky-100">
            <Package className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* 2. Spotlight Banner: BEST PRODUCT AS PER CUSTOMER (Per Month Breakdown) */}
      <div className="bg-gradient-to-br from-indigo-950 via-slate-900 to-purple-950 text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
        {/* Subtle decorative circles */}
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-10 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-gradient-to-tr from-amber-400 to-amber-200 text-slate-950 rounded-2xl shadow-lg shadow-amber-400/20">
                <Trophy className="w-6 h-6 stroke-[2.5]" />
              </div>
              <div>
                <h2 className="text-xl font-extrabold text-white tracking-tight flex items-center gap-2">
                  Best Product as per Customer
                  <span className="text-xs font-bold bg-amber-400/20 text-amber-300 border border-amber-400/30 px-2.5 py-0.5 rounded-full">
                    Monthly Top Choice
                  </span>
                </h2>
                <p className="text-xs text-slate-400 font-medium mt-0.5">
                  Calculated based on customer review volume, average monthly star rating, and 5-star feedback ratio.
                </p>
              </div>
            </div>

            {/* Month Tabs Selector */}
            {stats?.bestProductsPerMonth && stats.bestProductsPerMonth.length > 0 && (
              <div className="flex items-center gap-1.5 bg-slate-900/80 p-1.5 rounded-2xl border border-slate-800 overflow-x-auto">
                {stats.bestProductsPerMonth.map((m) => (
                  <button
                    key={m.monthKey}
                    onClick={() => setSelectedMonthTab(m.monthKey)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                      selectedMonthTab === m.monthKey
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    {m.monthName}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Current Month Best Product Spotlight Content */}
          {currentMonthBest?.bestProduct ? (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center bg-white/5 border border-white/10 p-6 rounded-2xl backdrop-blur-md">
              <div className="md:col-span-3 flex justify-center">
                <div className="relative w-36 h-36 sm:w-44 sm:h-44 rounded-2xl overflow-hidden border-2 border-white/10 shadow-2xl bg-slate-800">
                  <Image
                    src={currentMonthBest.bestProduct.image}
                    alt={currentMonthBest.bestProduct.title}
                    fill
                    sizes="(max-width: 768px) 144px, 176px"
                    className="object-cover"
                  />
                  <div className="absolute top-2 left-2 bg-amber-500 text-slate-950 font-black text-[10px] uppercase px-2 py-0.5 rounded-full shadow">
                    #1 Rated
                  </div>
                </div>
              </div>

              <div className="md:col-span-9 space-y-4">
                <div>
                  <div className="flex items-center gap-2 text-amber-400 text-xs font-bold uppercase tracking-wider mb-1">
                    <Sparkles className="w-4 h-4" />
                    Customer Winner for {currentMonthBest.monthName}
                  </div>
                  <h3 className="text-2xl font-black text-white">{currentMonthBest.bestProduct.title}</h3>
                  <p className="text-sm font-semibold text-slate-300 mt-1">
                    Price: {formatCurrency(currentMonthBest.bestProduct.price)}
                  </p>
                </div>

                {/* Monthly Stats Badge Pills */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div className="bg-slate-900/70 border border-slate-800 p-3 rounded-xl">
                    <span className="text-[11px] font-medium text-slate-400 block">Monthly Rating</span>
                    <div className="flex items-center gap-1.5 text-lg font-black text-amber-400 mt-0.5">
                      <Star className="w-4 h-4 fill-amber-400" />
                      {currentMonthBest.bestProduct.monthlyAvgRating} / 5.0
                    </div>
                  </div>

                  <div className="bg-slate-900/70 border border-slate-800 p-3 rounded-xl">
                    <span className="text-[11px] font-medium text-slate-400 block">Reviews in Month</span>
                    <span className="text-lg font-black text-white mt-0.5 block">
                      {currentMonthBest.bestProduct.monthlyReviewCount} comments
                    </span>
                  </div>

                  <div className="bg-slate-900/70 border border-slate-800 p-3 rounded-xl col-span-2 sm:col-span-1">
                    <span className="text-[11px] font-medium text-slate-400 block">5-Star Feedback</span>
                    <span className="text-lg font-black text-emerald-400 mt-0.5 block">
                      {currentMonthBest.bestProduct.fiveStarCount} verified 5★
                    </span>
                  </div>
                </div>

                <p className="text-xs text-slate-400 font-medium italic">
                  "Selected as the top product based on highest customer satisfaction score and positive review density during {currentMonthBest.monthName}."
                </p>
              </div>
            </div>
          ) : (
            <div className="p-8 text-center text-slate-400 bg-white/5 rounded-2xl border border-white/10">
              <Package className="w-10 h-10 mx-auto text-slate-500 mb-2" />
              <p className="text-sm font-semibold">No reviews recorded for this month yet.</p>
            </div>
          )}
        </div>
      </div>

      {/* 3. Monthly Statistics & Rating Breakdown Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Rating Distribution Bar Chart */}
        <div className="lg:col-span-5 bg-white p-6 rounded-3xl border border-slate-200/90 shadow-sm space-y-6">
          <div>
            <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-indigo-600" />
              Customer Rating Distribution
            </h3>
            <p className="text-xs text-slate-500 font-medium mt-1">
              Breakdown of ratings across all vendor products
            </p>
          </div>

          <div className="space-y-3">
            {[5, 4, 3, 2, 1].map((star) => {
              const count = stats?.ratingDistribution[star as 1 | 2 | 3 | 4 | 5] || 0;
              const total = stats?.totalReviews || 1;
              const pct = Math.round((count / total) * 100);

              return (
                <div key={star} className="flex items-center gap-3 text-xs">
                  <div className="flex items-center gap-1 w-14 font-bold text-slate-700">
                    <span>{star}</span>
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                  </div>
                  <div className="flex-1 bg-slate-100 h-3 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        star === 5
                          ? 'bg-emerald-500'
                          : star === 4
                          ? 'bg-indigo-500'
                          : star === 3
                          ? 'bg-amber-500'
                          : 'bg-rose-500'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="w-12 text-right font-extrabold text-slate-700">
                    {count} ({pct}%)
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Monthly Performance Table */}
        <div className="lg:col-span-7 bg-white p-6 rounded-3xl border border-slate-200/90 shadow-sm space-y-4">
          <div>
            <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-indigo-600" />
              Monthly Performance Summary
            </h3>
            <p className="text-xs text-slate-500 font-medium mt-1">
              Review volume and average rating trajectory per month
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">
                  <th className="py-2.5 px-3">Month</th>
                  <th className="py-2.5 px-3">Reviews</th>
                  <th className="py-2.5 px-3">Avg Rating</th>
                  <th className="py-2.5 px-3">Top Product</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
                {stats?.monthlyStats && stats.monthlyStats.length > 0 ? (
                  stats.monthlyStats.map((ms) => {
                    const bestForMonth = stats.bestProductsPerMonth.find((b) => b.monthKey === ms.monthKey)?.bestProduct;
                    return (
                      <tr key={ms.monthKey} className="hover:bg-slate-50">
                        <td className="py-3 px-3 font-bold text-slate-900">{ms.monthName}</td>
                        <td className="py-3 px-3">{ms.totalReviews} comments</td>
                        <td className="py-3 px-3">
                          <span className="px-2 py-0.5 rounded-lg bg-amber-50 text-amber-700 font-extrabold border border-amber-200">
                            ⭐ {ms.avgRating}
                          </span>
                        </td>
                        <td className="py-3 px-3 truncate max-w-[180px] text-indigo-600 font-bold">
                          {bestForMonth ? bestForMonth.title : 'N/A'}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-slate-400 font-medium">
                      No monthly review statistics available yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* 4. Filterable List of Product Reviews & Comments */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden space-y-4 p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div>
            <h3 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-indigo-600" />
              Product Reviews & Customer Comments
            </h3>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Showing {filteredReviews.length} of {reviews.length} customer feedback items
            </p>
          </div>

          {/* Filter & Search Bar */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Search Input */}
            <div className="relative min-w-[200px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search comments or users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-xl text-xs bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 font-medium"
              />
            </div>

            {/* Product Selector */}
            <select
              value={selectedProductFilter}
              onChange={(e) => setSelectedProductFilter(e.target.value)}
              className="py-2 px-3 rounded-xl text-xs bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 font-bold text-slate-700"
            >
              <option value="all">All Products ({stats?.productSummaries.length || 0})</option>
              {stats?.productSummaries.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </select>

            {/* Rating Filter */}
            <select
              value={selectedRatingFilter}
              onChange={(e) => setSelectedRatingFilter(e.target.value)}
              className="py-2 px-3 rounded-xl text-xs bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 font-bold text-slate-700"
            >
              <option value="all">All Ratings</option>
              <option value="5">5 Stars ⭐⭐⭐⭐⭐</option>
              <option value="4">4 Stars ⭐⭐⭐⭐</option>
              <option value="3">3 Stars ⭐⭐⭐</option>
              <option value="2">2 Stars ⭐⭐</option>
              <option value="1">1 Star ⭐</option>
            </select>
          </div>
        </div>

        {/* Reviews List */}
        {filteredReviews.length === 0 ? (
          <div className="py-12 text-center text-slate-400 space-y-2">
            <MessageSquare className="w-10 h-10 text-slate-300 mx-auto" />
            <p className="text-sm font-bold text-slate-700">No reviews found</p>
            <p className="text-xs text-slate-500 font-medium">Try adjusting your filters or search terms.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredReviews.map((rev) => (
              <div key={rev.id} className="py-5 first:pt-2 last:pb-2 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  {/* User info & Rating */}
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 text-white font-extrabold text-xs flex items-center justify-center shadow-md">
                      {rev.user.name ? rev.user.name.charAt(0).toUpperCase() : 'C'}
                    </div>
                    <div>
                      <h4 className="text-xs font-extrabold text-slate-900">{rev.user.name}</h4>
                      <p className="text-[11px] text-slate-500 font-medium">{rev.user.email}</p>
                    </div>
                  </div>

                  {/* Rating Stars & Timestamp */}
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1 bg-amber-50 border border-amber-200/80 px-2.5 py-1 rounded-xl">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={`w-3.5 h-3.5 ${
                            i < rev.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-300'
                          }`}
                        />
                      ))}
                      <span className="ml-1 text-xs font-black text-amber-800">{rev.rating}.0</span>
                    </div>

                    <span className="text-[11px] font-medium text-slate-400">
                      {new Date(rev.createdAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                  </div>
                </div>

                {/* Product Association Chip */}
                <div className="inline-flex items-center gap-2 bg-slate-50 hover:bg-slate-100/80 px-3 py-1.5 rounded-xl border border-slate-200/80 transition-colors">
                  <div className="relative w-6 h-6 rounded-md overflow-hidden bg-white border border-slate-200">
                    <Image src={rev.product.image} alt={rev.product.title} fill sizes="24px" className="object-cover" />
                  </div>
                  <span className="text-xs font-bold text-slate-800">{rev.product.title}</span>
                  <span className="text-[11px] font-medium text-indigo-600">({formatCurrency(rev.product.price)})</span>
                </div>

                {/* Comment Content */}
                <p className="text-xs font-medium text-slate-700 bg-slate-50/60 p-3.5 rounded-2xl border border-slate-200/60 leading-relaxed">
                  "{rev.comment}"
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
