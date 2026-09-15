'use client';

import React, { useState, useEffect } from 'react';
import { VendorOfferItem } from '@/app/api/vendor/offers/route';
import { CreateOfferModal } from './CreateOfferModal';
import { formatCurrency } from '@/lib/utils';
import {
  Tag,
  Plus,
  Calendar,
  Layers,
  Package,
  Trash2,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Sparkles,
  Percent,
} from 'lucide-react';

interface VendorOffersSectionProps {
  vendorProducts: { id: string; title: string }[];
}

export const VendorOffersSection: React.FC<VendorOffersSectionProps> = ({ vendorProducts }) => {
  const [offers, setOffers] = useState<VendorOfferItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filter, setFilter] = useState<'ALL' | 'ACTIVE' | 'UPCOMING' | 'EXPIRED'>('ALL');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchOffers = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/vendor/offers');
      if (res.ok) {
        const json = await res.json();
        setOffers(json.data || []);
      }
    } catch (err) {
      console.error('Error fetching vendor offers:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOffers();
  }, []);

  const handleDeleteOffer = async (id: string) => {
    if (!confirm('Are you sure you want to delete this promotional offer?')) return;
    try {
      setDeletingId(id);
      const res = await fetch(`/api/vendor/offers?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        setOffers((prev) => prev.filter((o) => o.id !== id));
      }
    } catch (err) {
      console.error('Error deleting offer:', err);
    } finally {
      setDeletingId(null);
    }
  };

  const getOfferStatus = (startDateStr: string, endDateStr: string) => {
    const now = new Date().getTime();
    const start = new Date(startDateStr).getTime();
    const end = new Date(endDateStr).getTime();

    if (now < start) return { label: 'UPCOMING', bg: 'bg-amber-50 text-amber-700 border-amber-200' };
    if (now > end) return { label: 'EXPIRED', bg: 'bg-slate-100 text-slate-500 border-slate-200' };
    return { label: 'ACTIVE', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
  };

  const formatDate = (isoStr: string) => {
    try {
      return new Date(isoStr).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoStr;
    }
  };

  const nowTime = Date.now();
  const activeCount = offers.filter((o) => {
    const s = new Date(o.startDate).getTime();
    const e = new Date(o.endDate).getTime();
    return nowTime >= s && nowTime <= e;
  }).length;

  const upcomingCount = offers.filter((o) => new Date(o.startDate).getTime() > nowTime).length;
  const expiredCount = offers.filter((o) => new Date(o.endDate).getTime() < nowTime).length;

  const filteredOffers = offers.filter((o) => {
    if (filter === 'ALL') return true;
    const status = getOfferStatus(o.startDate, o.endDate).label;
    return status === filter;
  });

  return (
    <div className="space-y-6">
      {/* Metrics Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 block">Active Promotions</span>
            <span className="text-2xl font-extrabold text-emerald-600">{activeCount}</span>
          </div>
          <div className="p-3 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 block">Scheduled / Upcoming</span>
            <span className="text-2xl font-extrabold text-amber-600">{upcomingCount}</span>
          </div>
          <div className="p-3 rounded-xl bg-amber-50 text-amber-600 border border-amber-100">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 block">Expired Offers</span>
            <span className="text-2xl font-extrabold text-slate-500">{expiredCount}</span>
          </div>
          <div className="p-3 rounded-xl bg-slate-100 text-slate-500 border border-slate-200">
            <Tag className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Command Bar: Filter Tabs & Create Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-2 overflow-x-auto">
          {(['ALL', 'ACTIVE', 'UPCOMING', 'EXPIRED'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all ${
                filter === f
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {f === 'ALL' ? `All Offers (${offers.length})` : f}
            </button>
          ))}
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/20 shrink-0 transition-all active:scale-95"
        >
          <Plus className="w-4 h-4" />
          Create New Offer
        </button>
      </div>

      {/* Offers Grid */}
      {loading ? (
        <div className="bg-white rounded-3xl p-12 text-center text-slate-500 border border-slate-200">
          <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-600" />
          <p className="text-xs font-semibold">Loading promotional offers...</p>
        </div>
      ) : filteredOffers.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center space-y-3 shadow-xs">
          <Tag className="w-10 h-10 text-slate-300 mx-auto" />
          <h3 className="text-sm font-bold text-slate-800">No promotional offers found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto font-medium">
            Click &quot;Create New Offer&quot; to publish special occasion discounts for your store.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredOffers.map((offer) => {
            const status = getOfferStatus(offer.startDate, offer.endDate);
            return (
              <div
                key={offer.id}
                className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs flex flex-col justify-between hover:shadow-md transition-shadow space-y-4"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className={`text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full border ${status.bg}`}>
                        {status.label}
                      </span>
                      <h3 className="text-base font-extrabold text-slate-900 mt-2">{offer.title}</h3>
                    </div>

                    <button
                      onClick={() => handleDeleteOffer(offer.id)}
                      disabled={deletingId === offer.id}
                      title="Delete Offer"
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors shrink-0"
                    >
                      {deletingId === offer.id ? (
                        <Loader2 className="w-4 h-4 animate-spin text-rose-600" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </button>
                  </div>

                  {/* Discount Value Badge */}
                  <div className="p-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-2xl flex items-center justify-between shadow-xs">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-indigo-100 block">Offer Discount</span>
                      <span className="text-xl font-black">
                        {offer.discountType === 'PERCENTAGE'
                          ? `${offer.discountValue}% OFF`
                          : `$${offer.discountValue} OFF`}
                      </span>
                    </div>
                    <div className="p-2 bg-white/20 rounded-xl backdrop-blur-xs">
                      <Percent className="w-5 h-5 text-white" />
                    </div>
                  </div>

                  {/* Applicable Scope */}
                  <div className="space-y-1">
                    <span className="text-[11px] font-bold text-slate-500 block">Target Scope:</span>
                    {offer.scope === 'ALL_PRODUCTS' && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700">
                        <Package className="w-3.5 h-3.5 text-indigo-600" /> All Catalog Products
                      </span>
                    )}
                    {offer.scope === 'CATEGORY' && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-50 border border-indigo-100 rounded-xl text-xs font-semibold text-indigo-700">
                        <Layers className="w-3.5 h-3.5 text-indigo-600" /> Category: {offer.categoryName || 'General'}
                      </span>
                    )}
                    {offer.scope === 'SPECIFIC_PRODUCTS' && (
                      <div className="space-y-1">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-purple-50 border border-purple-100 rounded-xl text-xs font-semibold text-purple-700">
                          <Package className="w-3.5 h-3.5 text-purple-600" /> {offer.productIds?.length || 0} Selected Products
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Date Validity Window */}
                  <div className="pt-2 border-t border-slate-100 space-y-1 text-xs text-slate-600">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-medium text-slate-400">Starts:</span>
                      <span className="font-semibold text-slate-800">{formatDate(offer.startDate)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-medium text-slate-400">Ends:</span>
                      <span className="font-semibold text-slate-800">{formatDate(offer.endDate)}</span>
                    </div>
                  </div>

                  {/* Note */}
                  {offer.note && (
                    <p className="text-[11px] text-slate-500 italic bg-slate-50 p-2 rounded-xl border border-slate-100">
                      &quot;{offer.note}&quot;
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Dedicated Offer Creation Modal */}
      <CreateOfferModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={fetchOffers}
        vendorProducts={vendorProducts}
      />
    </div>
  );
};
