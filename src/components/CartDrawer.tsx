import React, { useState } from 'react';
import Image from 'next/image';
import { X, Trash2, Plus, Minus, Warehouse, ArrowRight, Truck, Users, Sparkles } from 'lucide-react';
import { CartItem, INITIAL_VENDORS } from '@/lib/data';
import { formatCurrency, groupItemsByVendor } from '@/lib/utils';
import { Badge } from '@/components/common/Badge';
import { Button } from '@/components/common/Button';
import { useGroupShopping } from '@/context/GroupShoppingContext';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  onUpdateQuantity: (productId: string, delta: number) => void;
  onRemoveItem: (productId: string) => void;
  onProceedToCheckout: () => void;
}

export const CartDrawer: React.FC<CartDrawerProps> = React.memo(({
  isOpen,
  onClose,
  items,
  onUpdateQuantity,
  onRemoveItem,
  onProceedToCheckout,
}) => {
  const [activeCartTab, setActiveCartTab] = useState<'PERSONAL' | 'GROUP'>('PERSONAL');
  const {
    activeSession,
    isHost,
    activeMember,
    setIsGroupModalOpen,
    updateItemQuantity,
    removeItemFromGroup,
    initiateGroupCheckout,
  } = useGroupShopping();

  if (!isOpen) return null;

  const isGroupTab = activeCartTab === 'GROUP' && activeSession;

  // Convert items to uniform display structure with member attribution
  const displayItems = isGroupTab
    ? activeSession.items.map((gi) => ({
        product: gi.product,
        quantity: gi.quantity,
        addedByMember: gi.addedBy,
        groupItemId: gi.id,
      }))
    : items.map((i) => ({
        product: i.product,
        quantity: i.quantity,
        addedByMember: null,
        groupItemId: null,
      }));

  const subtotal = displayItems.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const freeShippingThreshold = 200;
  const progressPercent = Math.min(100, (subtotal / freeShippingThreshold) * 100);

  // Group items by vendor using common utility
  const groupedByVendor = groupItemsByVendor(
    displayItems as any,
    (item: any) => item.product.vendorId || 'vendor_urban_tech'
  );

  const vendorCount = Object.keys(groupedByVendor).length;

  return (
    <div className="fixed inset-0 z-[100] overflow-hidden bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="absolute inset-y-0 right-0 max-w-full flex pl-0 sm:pl-10">
        <div className="w-screen max-w-md bg-white text-slate-900 flex flex-col border-l border-slate-200 shadow-2xl animate-in slide-in-from-right duration-300">
          {/* Drawer Header */}
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-200">
                <Truck className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-extrabold text-slate-900">Your Shopping Cart</h2>
                <Badge variant={vendorCount > 1 ? 'secondary' : 'info'} size="sm" className="mt-0.5">
                  {vendorCount > 1 ? `${vendorCount} Vendor Packages` : 'Single Vendor Package'}
                </Badge>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Cart Type Tabs (Personal vs Group Cart) */}
          <div className="flex border-b border-slate-200 bg-slate-50 px-4">
            <button
              onClick={() => setActiveCartTab('PERSONAL')}
              className={`flex-1 py-2.5 text-xs font-bold border-b-2 transition-colors flex items-center justify-center space-x-1.5 ${
                activeCartTab === 'PERSONAL'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <span>🛒 My Cart ({items.length})</span>
            </button>

            {activeSession ? (
              <button
                onClick={() => setActiveCartTab('GROUP')}
                className={`flex-1 py-2.5 text-xs font-bold border-b-2 transition-colors flex items-center justify-center space-x-1.5 ${
                  activeCartTab === 'GROUP'
                    ? 'border-purple-600 text-purple-600'
                    : 'border-transparent text-slate-500 hover:text-purple-600'
                }`}
              >
                <Users className="w-3.5 h-3.5 text-purple-600" />
                <span>Group Cart ({activeSession.items.length})</span>
              </button>
            ) : (
              <button
                onClick={() => setIsGroupModalOpen(true)}
                className="flex-1 py-2.5 text-xs font-bold text-purple-600 hover:text-purple-700 flex items-center justify-center space-x-1"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Start Group Shopping</span>
              </button>
            )}
          </div>

          {/* Free Shipping Progress Bar */}
          <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
            <div className="flex justify-between text-xs mb-1.5 font-semibold">
              <span className="text-slate-700">
                {subtotal >= freeShippingThreshold ? (
                  <span className="text-emerald-600 font-bold">🎉 Free Express Shipping Unlocked!</span>
                ) : (
                  <>
                    Add <span className="text-indigo-600 font-bold">{formatCurrency(freeShippingThreshold - subtotal)}</span> more for Free Shipping
                  </>
                )}
              </span>
              <span className="text-slate-500">{Math.round(progressPercent)}%</span>
            </div>
            <div className="w-full h-2 rounded-full bg-slate-200 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-indigo-500 to-emerald-500 transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* Cart Items List with Vendor Sub-Order Partitioning */}
          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            {items.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center text-slate-400 space-y-3">
                <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center border border-slate-200">
                  <Truck className="w-8 h-8 text-slate-400" />
                </div>
                <p className="text-sm font-bold text-slate-700">Your cart is empty</p>
                <p className="text-xs text-slate-500 max-w-xs">
                  Explore our technical gear, outerwear, and audio equipment to add items.
                </p>
              </div>
            ) : (
              Object.entries(groupedByVendor).map(([vendorId, vendorItems]) => {
                const vendor = INITIAL_VENDORS.find((v) => v.id === vendorId);
                return (
                  <div key={vendorId} className="space-y-3">
                    {/* Sub-Order Group Header */}
                    <div className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-purple-50 border border-purple-200/80 text-xs">
                      <span className="font-bold text-purple-700 flex items-center gap-1.5">
                        <Warehouse className="w-3.5 h-3.5 text-purple-600" />
                        Sub-Order: {vendor?.name || 'Vendor Partner'}
                      </span>
                      <span className="text-[10px] text-purple-600 font-medium">{vendor?.warehouseLocation}</span>
                    </div>

                    {/* Vendor Items */}
                    <div className="space-y-2.5">
                      {vendorItems.map((item: any) => (
                        <div
                          key={item.groupItemId || item.product.id}
                          className="flex gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-200 hover:border-slate-300 transition-colors"
                        >
                          <div className="relative w-16 h-16 rounded-xl overflow-hidden bg-slate-100 flex-shrink-0">
                            <Image
                              src={item.product.image}
                              alt={item.product.title}
                              fill
                              sizes="64px"
                              className="object-cover"
                            />
                          </div>

                          <div className="flex-1 flex flex-col justify-between">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <h4 className="text-xs font-bold text-slate-900 line-clamp-1">
                                  {item.product.title}
                                </h4>
                                {item.addedByMember && (
                                  <span className="inline-block text-[10px] font-semibold bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300 px-1.5 py-0.5 rounded mt-0.5">
                                    Added by {item.addedByMember.guestName}
                                  </span>
                                )}
                              </div>
                              <button
                                onClick={() => {
                                  if (isGroupTab && item.groupItemId) {
                                    removeItemFromGroup(item.groupItemId);
                                  } else {
                                    onRemoveItem(item.product.id);
                                  }
                                }}
                                className="text-slate-400 hover:text-rose-600 transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            <div className="flex items-center justify-between text-xs mt-2">
                              <span className="font-extrabold text-slate-900">{formatCurrency(item.product.price)}</span>
                              <div className="flex items-center gap-2 bg-white px-2 py-1 rounded-lg border border-slate-200 shadow-sm">
                                <button
                                  onClick={() => {
                                    if (isGroupTab && item.groupItemId) {
                                      updateItemQuantity(item.groupItemId, item.quantity - 1);
                                    } else {
                                      onUpdateQuantity(item.product.id, -1);
                                    }
                                  }}
                                  className="text-slate-500 hover:text-slate-900"
                                >
                                  <Minus className="w-3 h-3" />
                                </button>
                                <span className="font-bold text-slate-900 text-xs px-1">
                                  {item.quantity}
                                </span>
                                <button
                                  onClick={() => {
                                    if (isGroupTab && item.groupItemId) {
                                      updateItemQuantity(item.groupItemId, item.quantity + 1);
                                    } else {
                                      onUpdateQuantity(item.product.id, 1);
                                    }
                                  }}
                                  className="text-slate-500 hover:text-slate-900"
                                >
                                  <Plus className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Drawer Footer */}
          {displayItems.length > 0 && (
            <div className="p-4 border-t border-slate-200 bg-white space-y-3">
              <div className="space-y-1.5 text-xs text-slate-500 font-medium">
                <div className="flex justify-between">
                  <span>{isGroupTab ? 'Group Cart Subtotal' : 'Cart Subtotal'}</span>
                  <span className="text-slate-900 font-semibold">{formatCurrency(subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Vendor Sub-Orders Generated</span>
                  <span className="text-purple-700 font-bold">{vendorCount} Packages</span>
                </div>
                <div className="flex justify-between pt-1.5 border-t border-slate-100 text-sm font-extrabold text-slate-900">
                  <span>Total Amount</span>
                  <span className="text-indigo-600">{formatCurrency(subtotal)}</span>
                </div>
              </div>

              <Button
                variant="primary"
                size="lg"
                fullWidth
                onClick={onProceedToCheckout}
                rightIcon={<ArrowRight className="w-4 h-4" />}
                className={isGroupTab ? 'bg-purple-600 hover:bg-purple-700 text-white font-bold shadow-md shadow-purple-600/25' : 'bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-md shadow-indigo-600/25'}
              >
                {isGroupTab ? 'Proceed to Group Checkout' : 'Proceed to Checkout'}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

CartDrawer.displayName = 'CartDrawer';
