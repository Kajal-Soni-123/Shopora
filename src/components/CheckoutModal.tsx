'use client';

import React, { useState } from 'react';
import { CreditCard, ShieldCheck, Truck, Warehouse, CheckCircle2, ArrowRight, Lock } from 'lucide-react';
import { CartItem, Order, INITIAL_VENDORS } from '@/lib/data';
import { formatCurrency, groupItemsByVendor, calculateOrderTotals } from '@/lib/utils';
import { PAYMENT_METHODS } from '@/lib/constants';
import { Modal } from '@/components/common/Modal';
import { Button } from '@/components/common/Button';
import { Badge } from '@/components/common/Badge';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  onOrderSuccess: (order: Order) => void;
}

export const CheckoutModal: React.FC<CheckoutModalProps> = React.memo(({
  isOpen,
  onClose,
  items,
  onOrderSuccess,
}) => {
  const [step, setStep] = useState<1 | 2>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: 'Alex Morgan',
    email: 'alex.morgan@example.com',
    address: '742 Evergreen Terrace, Seattle, WA 98101',
    paymentMethod: 'CREDIT_CARD',
  });

  const { subtotal } = calculateOrderTotals(items);

  // Group items by vendor using utility function
  const itemsByVendor = groupItemsByVendor(
    items,
    (item) => item.product.vendorId || 'vendor_urban_tech'
  );

  const vendorCount = Object.keys(itemsByVendor).length;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (step === 1) {
      setStep(2);
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items,
          customerName: formData.name,
          customerEmail: formData.email,
          shippingAddress: formData.address,
          paymentMethod: formData.paymentMethod,
        }),
      });

      const result = await res.json();
      // Handle both standardized ApiResponse format (result.data.order) and legacy envelope
      const order = result.data?.order || result.order;
      if (result.success && order) {
        onOrderSuccess(order);
      } else {
        alert(result.error || 'Failed to place order');
      }
    } catch (err) {
      console.error(err);
      alert('Error placing order');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="2xl"
      title={
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-200 flex items-center justify-center text-sm font-extrabold">
            {step}
          </div>
          <div>
            <span className="text-base font-extrabold text-slate-900 block">
              {step === 1 ? 'Shipping & Sub-Order Breakdown' : 'Payment & Final Confirmation'}
            </span>
            <span className="text-xs text-slate-500 font-medium">
              Step {step} of 2 • Next.js App Router API & PostgreSQL Partitioning
            </span>
          </div>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {step === 1 ? (
          <div className="space-y-5">
            {/* Form Inputs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-slate-50 text-sm text-slate-900 px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:bg-white focus:border-indigo-600 transition-colors font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full bg-slate-50 text-sm text-slate-900 px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:bg-white focus:border-indigo-600 transition-colors font-medium"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Shipping Address
              </label>
              <input
                type="text"
                required
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full bg-slate-50 text-sm text-slate-900 px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:bg-white focus:border-indigo-600 transition-colors font-medium"
              />
            </div>

            {/* Sub-Orders Breakdown Preview */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-extrabold text-purple-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Truck className="w-4 h-4 text-purple-600" />
                  Sub-Orders Partitioning Preview
                </h4>
                <Badge variant="secondary" size="sm">
                  {vendorCount} Packages
                </Badge>
              </div>

              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {Object.entries(itemsByVendor).map(([vendorId, vendorItems], idx) => {
                  const vendor = INITIAL_VENDORS.find((v) => v.id === vendorId);
                  const vendorSubtotal = vendorItems.reduce(
                    (s, i) => s + i.product.price * i.quantity,
                    0
                  );
                  return (
                    <div
                      key={vendorId}
                      className="p-3 rounded-xl bg-purple-50 border border-purple-200 flex items-center justify-between text-xs"
                    >
                      <div className="space-y-0.5">
                        <div className="font-bold text-slate-900 flex items-center gap-1.5">
                          <span className="w-4 h-4 rounded-full bg-purple-600 text-white text-[10px] flex items-center justify-center font-bold">
                            {idx + 1}
                          </span>
                          Sub-Order: {vendor?.name || 'Vendor Partner'}
                        </div>
                        <p className="text-[11px] text-purple-700 font-medium flex items-center gap-1">
                          <Warehouse className="w-3 h-3 text-purple-600" />
                          {vendor?.warehouseLocation} • {vendorItems.length} item(s)
                        </p>
                      </div>
                      <span className="font-extrabold text-indigo-600">{formatCurrency(vendorSubtotal)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            {/* Payment Method Selector */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2">
                Select Payment Method
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {PAYMENT_METHODS.map((method) => {
                  const isSelected = formData.paymentMethod === method.id;
                  return (
                    <button
                      key={method.id}
                      type="button"
                      onClick={() => setFormData({ ...formData, paymentMethod: method.id })}
                      className={`p-3 rounded-xl border text-xs font-bold flex flex-col items-center gap-2 transition-all ${
                        isSelected
                          ? 'bg-indigo-50 border-indigo-600 text-indigo-700 shadow-sm'
                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      <span className="text-xl">{method.icon}</span>
                      <span className="text-center">{method.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Order Summary Box */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
              <div className="flex justify-between text-slate-600 font-medium">
                <span>Items Total ({items.length})</span>
                <span className="text-slate-900 font-bold">{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between text-slate-600 font-medium">
                <span>Shipping & Split Handling</span>
                <Badge variant="success" size="sm">FREE</Badge>
              </div>
              <div className="flex justify-between text-slate-600 font-medium">
                <span>Generated Sub-Orders</span>
                <span className="text-purple-700 font-bold">{vendorCount} Child Orders</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-slate-200 text-sm font-extrabold text-slate-900">
                <span>Total Payable</span>
                <span className="text-indigo-600">{formatCurrency(subtotal)}</span>
              </div>
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-100">
          {step === 2 ? (
            <Button
              type="button"
              variant="outline"
              size="md"
              onClick={() => setStep(1)}
              className="border-slate-200 text-slate-700 hover:bg-slate-100"
            >
              Back to Details
            </Button>
          ) : (
            <div />
          )}

          <Button
            type="submit"
            variant="primary"
            size="md"
            isLoading={isSubmitting}
            rightIcon={
              step === 1 ? (
                <ArrowRight className="w-4 h-4" />
              ) : (
                <CheckCircle2 className="w-4 h-4" />
              )
            }
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-md shadow-indigo-600/25"
          >
            {step === 1
              ? 'Continue to Payment'
              : `Place Order & Split Sub-Orders (${formatCurrency(subtotal)})`}
          </Button>
        </div>
      </form>
    </Modal>
  );
});

CheckoutModal.displayName = 'CheckoutModal';
