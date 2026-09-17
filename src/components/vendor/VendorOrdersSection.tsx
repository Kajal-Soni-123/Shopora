'use client';

import React, { useState } from 'react';
import { SubOrderCard, VendorSubOrderData } from '@/components/vendor/SubOrderCard';
import { Truck, Loader2, Search, Filter } from 'lucide-react';

interface VendorOrdersSectionProps {
  subOrders: VendorSubOrderData[];
  loadingData: boolean;
  onUpdateStatus: (
    subOrderId: string,
    status: string,
    trackingNumber: string,
    shippingCarrier: string,
    note?: string
  ) => Promise<void>;
  updatingId: string | null;
}

const filterTabs = [
  { id: 'ALL', label: 'All Orders' },
  { id: 'PENDING', label: 'Pending' },
  { id: 'CONFIRMED', label: 'Confirmed' },
  { id: 'PACKED', label: 'Packed' },
  { id: 'SHIPPED', label: 'Shipped' },
  { id: 'OUT_FOR_DELIVERY', label: 'Out for Delivery' },
  { id: 'DELIVERED', label: 'Delivered' },
  { id: 'CANCELLED', label: 'Cancelled' },
];

export const VendorOrdersSection: React.FC<VendorOrdersSectionProps> = ({
  subOrders,
  loadingData,
  onUpdateStatus,
  updatingId,
}) => {
  const [activeFilter, setActiveFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  if (loadingData) {
    return (
      <div className="p-12 text-center text-slate-500 bg-white rounded-3xl border border-slate-200 shadow-sm">
        <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-600" />
        <p className="text-xs font-semibold">Loading assigned sub-orders...</p>
      </div>
    );
  }

  // Filter sub-orders
  const filteredSubOrders = subOrders.filter((so) => {
    // Status Filter
    if (activeFilter !== 'ALL' && so.status !== activeFilter) {
      return false;
    }
    // Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchOrderNum = so.subOrderNumber.toLowerCase().includes(q) || so.order.orderNumber.toLowerCase().includes(q);
      const matchCustomer = so.order.customerName.toLowerCase().includes(q) || so.order.customerEmail.toLowerCase().includes(q);
      const matchTracking = (so.trackingNumber || '').toLowerCase().includes(q);
      const matchItems = so.items.some((i) => i.product.title.toLowerCase().includes(q));

      return matchOrderNum || matchCustomer || matchTracking || matchItems;
    }
    return true;
  });

  // Calculate status counts
  const getCount = (statusId: string) => {
    if (statusId === 'ALL') return subOrders.length;
    return subOrders.filter((so) => so.status === statusId).length;
  };

  return (
    <div className="space-y-6">
      {/* Control Bar: Search & Status Filters */}
      <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/90 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by order #, tracking ID, customer..."
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600"
            />
          </div>

          <div className="flex items-center gap-1 text-xs text-slate-500 font-bold shrink-0">
            <Filter className="w-3.5 h-3.5 text-indigo-600" />
            <span>Showing {filteredSubOrders.length} of {subOrders.length} orders</span>
          </div>
        </div>

        {/* Status Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none border-t border-slate-100 pt-3">
          {filterTabs.map((tab) => {
            const count = getCount(tab.id);
            const isSelected = activeFilter === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => setActiveFilter(tab.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all shrink-0 flex items-center gap-1.5 border ${
                  isSelected
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm shadow-indigo-600/25'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200'
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`px-1.5 py-0.5 rounded-md text-[10px] ${
                    isSelected ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Orders List */}
      {filteredSubOrders.length === 0 ? (
        <div className="p-12 text-center text-slate-500 bg-white rounded-3xl border border-slate-200 shadow-sm space-y-2">
          <Truck className="w-10 h-10 text-slate-300 mx-auto" />
          <h3 className="text-sm font-bold text-slate-800">No sub-orders found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto font-medium">
            {searchQuery || activeFilter !== 'ALL'
              ? 'No sub-orders match the selected status filter or search criteria.'
              : 'When customers purchase your items, sub-orders dispatched from your warehouse will appear here.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredSubOrders.map((so) => (
            <SubOrderCard
              key={so.id}
              subOrder={so}
              onUpdateStatus={onUpdateStatus}
              isUpdating={updatingId === so.id}
            />
          ))}
        </div>
      )}
    </div>
  );
};
