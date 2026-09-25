'use client';

import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import {
  CreditCard,
  ShieldCheck,
  Truck,
  Warehouse,
  CheckCircle2,
  ArrowRight,
  QrCode,
  Building2,
  Wallet,
  Lock,
  Smartphone,
  RefreshCw,
  AlertCircle,
  Check,
  MapPin,
} from 'lucide-react';

function RealUpiQrCode({ amount }: { amount: number }) {
  const [qrUrl, setQrUrl] = useState<string>('');

  useEffect(() => {
    const upiUri = `upi://pay?pa=shoporapay@icici&pn=Shopora%20Marketplace&am=${amount.toFixed(2)}&cu=INR&tn=Shopora%20Order`;
    QRCode.toDataURL(upiUri, {
      width: 320,
      margin: 1,
      color: {
        dark: '#0F172A',
        light: '#FFFFFF',
      },
    })
      .then(setQrUrl)
      .catch(console.error);
  }, [amount]);

  return (
    <div className="flex flex-col items-center justify-center p-5 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-3">
      {/* Official UPI Header */}
      <div className="flex items-center justify-between w-full px-2 pb-2 border-b border-slate-100">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-black tracking-widest text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
            UPI
          </span>
          <span className="text-xs font-bold text-slate-700">BHIM UPI QR Payment</span>
        </div>
        <span className="text-[10px] font-extrabold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
          VERIFIED MERCHANT
        </span>
      </div>

      {/* Real Generated QR Image */}
      <div className="p-3 bg-white border-2 border-indigo-600/30 rounded-2xl shadow-inner flex items-center justify-center">
        {qrUrl ? (
          <img src={qrUrl} alt="Real UPI Payment QR Code" className="w-48 h-48 rounded-lg" />
        ) : (
          <div className="w-48 h-48 flex items-center justify-center text-xs text-slate-400 font-semibold">
            Generating UPI QR Code...
          </div>
        )}
      </div>

      {/* Merchant Payment Details Card */}
      <div className="w-full bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-center space-y-0.5">
        <p className="text-xs font-bold text-slate-900">Shopora Marketplace (ICICI Bank)</p>
        <p className="text-[11px] text-slate-500 font-mono font-medium">VPA: shoporapay@icici</p>
      </div>

      {/* Accepted UPI App Logos / Pills */}
      <div className="flex items-center justify-center gap-1.5 flex-wrap">
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-sky-500 text-white shadow-xs">GPay</span>
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-purple-600 text-white shadow-xs">PhonePe</span>
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-600 text-white shadow-xs">Paytm</span>
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-600 text-white shadow-xs">BHIM UPI</span>
      </div>

      <p className="text-[11px] font-semibold text-slate-500 text-center">
        Scan using GPay, PhonePe, Paytm, BHIM, or any UPI app to pay ₹{amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
      </p>
    </div>
  );
}
import { CartItem, Order, INITIAL_VENDORS } from '@/lib/data';
import { formatCurrency, groupItemsByVendor, calculateOrderTotals } from '@/lib/utils';
import { PAYMENT_METHODS } from '@/lib/constants';
import { Flyout } from '@/components/common/Flyout';
import { Button } from '@/components/common/Button';
import { Badge } from '@/components/common/Badge';
import { useAuth } from '@/context/AuthContext';
import { PhoneInput } from '@/components/common/PhoneInput';
import { AddressMapModal } from '@/components/AddressMapModal';
import {
  detectCardBrand,
  formatCardNumber,
  formatExpiryDate,
  validateCardNumber,
  validateExpiryDate,
  validateUpiId,
  CARD_BRANDS,
} from '@/lib/paymentGateway';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  onOrderSuccess: (order: Order) => void;
  isDirectBuy?: boolean;
}

export const CheckoutModal: React.FC<CheckoutModalProps> = React.memo(({
  isOpen,
  onClose,
  items,
  onOrderSuccess,
  isDirectBuy = false,
}) => {
  const { user } = useAuth();
  const [step, setStep] = useState<1 | 2>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isMapModalOpen, setIsMapModalOpen] = useState(false);
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otpInput, setOtpInput] = useState('123456');
  const [otpError, setOtpError] = useState('');
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [pendingIntentId, setPendingIntentId] = useState('');
  const [toastError, setToastError] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastError(msg);
    setTimeout(() => {
      setToastError((current) => (current === msg ? null : current));
    }, 4000);
  };

  // Shipping & Contact State
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    address: user?.homeAddress || user?.workAddress || '',
    paymentMethod: 'CREDIT_CARD',
  });

  // Sync user profile data (including Primary Address) when user or modal opens
  React.useEffect(() => {
    if (isOpen && user) {
      const primaryAddr =
        user.primaryAddressType === 'WORK'
          ? user.workAddress || user.homeAddress || ''
          : user.homeAddress || user.workAddress || '';

      setFormData((prev) => ({
        ...prev,
        name: user.name || prev.name,
        email: user.email || prev.email,
        phone: user.phone || prev.phone,
        address: primaryAddr || prev.address,
      }));
    }
  }, [isOpen, user]);

  // Card Payment Details State
  const [cardDetails, setCardDetails] = useState({
    number: '4532 0123 4567 8901',
    expiry: '12/28',
    cvv: '888',
    holder: 'Alex Morgan',
  });

  // UPI State
  const [upiDetails, setUpiDetails] = useState({
    upiId: 'alex.morgan@okaxis',
    showQr: false,
  });

  // Net Banking / Wallet selection state
  const [selectedBank, setSelectedBank] = useState('HDFC');
  const [selectedWallet, setSelectedWallet] = useState('Apple Pay');

  const { subtotal } = calculateOrderTotals(items);
  const detectedBrand = detectCardBrand(cardDetails.number);
  const brandInfo = CARD_BRANDS.find((b) => b.brand === detectedBrand);

  // Group items by vendor
  const itemsByVendor = groupItemsByVendor(
    items,
    (item) => item.product.vendorId || 'vendor_urban_tech'
  );
  const vendorCount = Object.keys(itemsByVendor).length;

  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCardNumber(e.target.value);
    setCardDetails((prev) => ({ ...prev, number: formatted }));
  };

  const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatExpiryDate(e.target.value);
    setCardDetails((prev) => ({ ...prev, expiry: formatted }));
  };

  const processOrderCreation = async (transactionId?: string, maskedPaymentInfo?: string) => {
    setIsSubmitting(true);
    try {
      let maskedDetails = maskedPaymentInfo;
      if (!maskedDetails) {
        if (formData.paymentMethod === 'CREDIT_CARD') {
          const clean = cardDetails.number.replace(/\s+/g, '');
          const last4 = clean.slice(-4) || '4242';
          maskedDetails = `${brandInfo?.name || 'Card'} ending in •••• ${last4}`;
        } else if (formData.paymentMethod === 'UPI') {
          maskedDetails = `UPI ID: ${upiDetails.upiId}`;
        } else if (formData.paymentMethod === 'NET_BANKING') {
          maskedDetails = `Netbanking: ${selectedBank} Bank`;
        } else {
          maskedDetails = `Wallet: ${selectedWallet}`;
        }
      }

      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items,
          customerName: formData.name,
          customerEmail: formData.email,
          customerPhone: formData.phone,
          shippingAddress: formData.address,
          paymentMethod: formData.paymentMethod,
          transactionId: transactionId || `pay_${Math.random().toString(36).substring(2, 11)}`,
          paymentDetails: {
            method: formData.paymentMethod,
            maskedDetails,
            provider: 'Shopora Pay Gateway',
          },
        }),
      });

      const result = await res.json();
      const order = result.data?.order || result.order;
      if (result.success && order) {
        setShowOtpModal(false);
        onOrderSuccess(order);
      } else {
        showToast(result.error || 'Failed to place order');
      }

    } catch (err) {
      console.error(err);
      showToast('Error finalizing order payment');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (step === 1) {
      setStep(2);
      return;
    }

    // If Cash on Delivery is selected, process order directly without online payment intent
    if (formData.paymentMethod === 'COD') {
      setIsSubmitting(true);
      try {
        const pincodeMatch = (formData.address || '').match(/\b\d{6}\b/);
        const pincode = pincodeMatch ? pincodeMatch[0] : '400001';

        const codCheckRes = await fetch(`/api/checkout/cod-availability?pincode=${pincode}&orderAmount=${subtotal}`);
        const codCheckData = await codCheckRes.json();
        const codResult = codCheckData.data || codCheckData;

        if (!codCheckRes.ok || (codResult && !codResult.allowed)) {
          showToast(codResult?.reason || 'Cash on Delivery is unavailable for this order.');
          setIsSubmitting(false);
          return;
        }

        await processOrderCreation(`cod_${Math.random().toString(36).substring(2, 10)}`, 'Cash on Delivery (Pay on Delivery)');
      } catch (err) {
        console.error('COD order creation error:', err);
        setIsSubmitting(false);
        showToast('Error processing Cash on Delivery order.');
      }
      return;
    }

    // Client-side validations for online payment methods
    if (formData.paymentMethod === 'CREDIT_CARD') {
      if (!validateCardNumber(cardDetails.number)) {
        showToast('Please enter a valid 16-digit credit card number.');
        return;
      }
      if (!validateExpiryDate(cardDetails.expiry)) {
        showToast('Please enter a valid future expiration date (MM/YY).');
        return;
      }
      if (cardDetails.cvv.length < 3) {
        showToast('Please enter a valid CVV.');
        return;
      }
    } else if (formData.paymentMethod === 'UPI' && !upiDetails.showQr) {
      if (!validateUpiId(upiDetails.upiId)) {
        showToast('Please enter a valid UPI ID (e.g., username@bank).');
        return;
      }
    }

    // Create payment intent
    setIsSubmitting(true);
    try {
      const intentRes = await fetch('/api/payments/create-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: subtotal,
          paymentMethod: formData.paymentMethod,
          cardDetails,
          upiDetails,
        }),
      });
      const intentData = await intentRes.json();
      const intent = intentData.data || intentData;

      if (!intentRes.ok) {
        showToast(intentData.error || 'Failed to create payment intent');
        setIsSubmitting(false);
        return;
      }

      if (intent.requires3DS) {
        setPendingIntentId(intent.intentId);
        setShowOtpModal(true);
        setIsSubmitting(false);
      } else {
        await processOrderCreation();
      }
    } catch (err) {
      console.error('Payment intent error:', err);
      setIsSubmitting(false);
      showToast('Payment processing error');
    }
  };

  const handleVerifyOtp = async () => {
    setIsVerifyingOtp(true);
    setOtpError('');
    try {
      const verifyRes = await fetch('/api/payments/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          intentId: pendingIntentId,
          otp: otpInput,
        }),
      });

      const verifyData = await verifyRes.json();
      if (verifyRes.ok && verifyData.success) {
        const paymentId = verifyData.data?.paymentId || `pay_${Math.random().toString(36).substring(2, 10)}`;
        await processOrderCreation(paymentId);
      } else {
        setOtpError(verifyData.error || 'Invalid OTP. Please enter 123456.');
      }
    } catch (err) {
      setOtpError('Error verifying security code.');
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  return (
    <>
      <Flyout
        isOpen={isOpen}
        onClose={onClose}
        maxWidth="2xl"
        title={
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-200 flex items-center justify-center text-sm font-extrabold shrink-0">
              {step}
            </div>
            <div>
              <span className="text-base font-extrabold text-slate-900 block leading-tight">
                {step === 1 ? 'Shipping & Order Breakdown' : 'Shopora Gateway Payment'}
              </span>
              <span className="text-xs text-slate-500 font-medium">
                Step {step} of 2 • 256-Bit Encrypted Secure Checkout
              </span>
            </div>
          </div>
        }
        footer={
          <div className="flex items-center justify-between w-full">
            {step === 2 ? (
              <Button
                type="button"
                variant="outline"
                size="md"
                onClick={() => setStep(1)}
              >
                Back to Details
              </Button>
            ) : (
              <Button
                type="button"
                variant="outline"
                size="md"
                onClick={onClose}
              >
                Cancel
              </Button>
            )}

            <Button
              type="submit"
              form="checkout-form"
              variant="primary"
              size="md"
              isLoading={isSubmitting}
              rightIcon={
                step === 1 ? (
                  <ArrowRight className="w-4 h-4" />
                ) : (
                  <Lock className="w-4 h-4" />
                )
              }
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-md shadow-indigo-600/25"
            >
              {step === 1
                ? 'Continue to Payment'
                : `Pay (${formatCurrency(subtotal)})`}
            </Button>
          </div>
        }
      >
        <form id="checkout-form" onSubmit={handleSubmit} className="space-y-6">
          {/* Animated Error Toast Banner */}
          {toastError && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-center justify-between shadow-sm animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{toastError}</span>
              </div>
              <button
                type="button"
                onClick={() => setToastError(null)}
                className="text-rose-400 hover:text-rose-700 text-sm font-black px-1"
              >
                ✕
              </button>
            </div>
          )}
          {step === 1 ? (
            <div className="space-y-5">
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
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-700">
                    Phone Number (SMS / WhatsApp Tracking Alerts)
                  </label>
                  <span className="text-[10px] text-indigo-600 font-extrabold uppercase">Twilio Enabled</span>
                </div>
                <PhoneInput
                  required
                  value={formData.phone}
                  onChange={(val) => setFormData((prev) => ({ ...prev, phone: val }))}
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-700">
                    Shipping Address
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsMapModalOpen(true)}
                    className="text-xs text-indigo-600 hover:text-indigo-800 font-extrabold flex items-center gap-1 transition-colors hover:underline"
                  >
                    <MapPin className="w-3.5 h-3.5" />
                    <span>🗺️ Choose on Map</span>
                  </button>
                </div>
                <input
                  type="text"
                  required
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full bg-slate-50 text-sm text-slate-900 px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:bg-white focus:border-indigo-600 transition-colors font-medium"
                />
              </div>

              {/* Address Map Picker Modal */}
              <AddressMapModal
                isOpen={isMapModalOpen}
                onClose={() => setIsMapModalOpen(false)}
                initialAddress={formData.address}
                onSelectAddress={(selectedAddr) =>
                  setFormData((prev) => ({ ...prev, address: selectedAddr }))
                }
              />

              {/* Sub-Orders Breakdown Preview */}
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-extrabold text-purple-700 uppercase tracking-wider flex items-center gap-1.5">
                    <Truck className="w-4 h-4 text-purple-600" />
                    Sub-Orders Partitioning Preview
                  </h4>
                  <Badge variant="secondary" size="sm">
                    {vendorCount} Packages
                  </Badge>
                </div>

                <div className="space-y-2 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
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
              {/* Payment Method Selector Tabs */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">
                  Select Payment Method
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {PAYMENT_METHODS.map((method) => {
                    const isSelected = formData.paymentMethod === method.id;
                    return (
                      <button
                        key={method.id}
                        type="button"
                        onClick={() => setFormData({ ...formData, paymentMethod: method.id })}
                        className={`p-3 rounded-xl border text-xs font-bold flex flex-col items-center gap-1.5 transition-all ${isSelected
                          ? 'bg-indigo-50 border-indigo-600 text-indigo-700 shadow-sm ring-2 ring-indigo-500/20'
                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300'
                          }`}
                      >
                        <span className="text-xl">{method.icon}</span>
                        <span className="text-center text-[11px]">{method.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Dynamic Payment Details Interface */}
              {formData.paymentMethod === 'CREDIT_CARD' && (
                <div className="space-y-4 p-4 rounded-2xl bg-gradient-to-br from-slate-900 to-indigo-950 text-white shadow-xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

                  <div className="flex justify-between items-center pb-2 border-b border-white/10">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-5 bg-amber-400/90 rounded-sm flex items-center justify-center font-bold text-[9px] text-slate-900">
                        CHIP
                      </div>
                      <span className="text-xs font-bold text-slate-300">Stripe Enabled Card</span>
                    </div>
                    <span className="text-sm font-black text-amber-300 uppercase tracking-wider flex items-center gap-1">
                      {brandInfo ? brandInfo.name : 'Card'}
                    </span>
                  </div>

                  {/* Stripe Test Card Quick Fill Pill */}
                  <div className="flex items-center justify-between p-2 rounded-xl bg-indigo-500/20 border border-indigo-400/30 text-[11px] text-indigo-200">
                    <span>Stripe Test Card: <strong className="text-white font-mono">4242 4242 4242 4242</strong></span>
                    <button
                      type="button"
                      onClick={() =>
                        setCardDetails((prev) => ({
                          ...prev,
                          number: '4242 4242 4242 4242',
                          expiry: '12/28',
                          cvv: '888',
                        }))
                      }
                      className="px-2 py-0.5 rounded bg-indigo-600 text-white text-[10px] font-bold hover:bg-indigo-500 transition-colors"
                    >
                      Use Test Card
                    </button>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-indigo-200 uppercase tracking-wider mb-1">
                      Card Number
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        maxLength={19}
                        value={cardDetails.number}
                        onChange={handleCardNumberChange}
                        placeholder="4532 0123 4567 8901"
                        className="w-full bg-white/10 text-white placeholder-white/30 text-sm font-mono tracking-widest px-3.5 py-2.5 rounded-xl border border-white/20 focus:outline-none focus:border-amber-400 font-bold"
                      />
                      {validateCardNumber(cardDetails.number) && (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 absolute right-3 top-3" />
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-indigo-200 uppercase tracking-wider mb-1">
                        Expiry Date
                      </label>
                      <input
                        type="text"
                        maxLength={5}
                        value={cardDetails.expiry}
                        onChange={handleExpiryChange}
                        placeholder="MM/YY"
                        className="w-full bg-white/10 text-white placeholder-white/30 text-xs font-mono px-3 py-2 rounded-xl border border-white/20 focus:outline-none focus:border-amber-400 font-bold"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-indigo-200 uppercase tracking-wider mb-1">
                        CVV Code
                      </label>
                      <input
                        type="password"
                        maxLength={4}
                        value={cardDetails.cvv}
                        onChange={(e) => setCardDetails({ ...cardDetails, cvv: e.target.value })}
                        placeholder="•••"
                        className="w-full bg-white/10 text-white placeholder-white/30 text-xs font-mono px-3 py-2 rounded-xl border border-white/20 focus:outline-none focus:border-amber-400 font-bold"
                      />
                    </div>

                    <div className="col-span-2 sm:col-span-1">
                      <label className="block text-[10px] font-bold text-indigo-200 uppercase tracking-wider mb-1">
                        Holder Name
                      </label>
                      <input
                        type="text"
                        value={cardDetails.holder}
                        onChange={(e) => setCardDetails({ ...cardDetails, holder: e.target.value })}
                        className="w-full bg-white/10 text-white placeholder-white/30 text-xs px-3 py-2 rounded-xl border border-white/20 focus:outline-none focus:border-amber-400 font-medium"
                      />
                    </div>
                  </div>
                </div>
              )}

              {formData.paymentMethod === 'UPI' && (
                <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-indigo-900 flex items-center gap-1.5">
                      <Smartphone className="w-4 h-4 text-indigo-600" />
                      Instant UPI Payment & QR Code
                    </span>
                    <button
                      type="button"
                      onClick={() => setUpiDetails((p) => ({ ...p, showQr: !p.showQr }))}
                      className="text-xs font-extrabold text-indigo-600 hover:text-indigo-800 underline flex items-center gap-1"
                    >
                      <QrCode className="w-3.5 h-3.5" />
                      {upiDetails.showQr ? 'Enter VPA Handle' : 'Scan QR Code Instead'}
                    </button>
                  </div>

                  {upiDetails.showQr ? (
                    <RealUpiQrCode amount={subtotal} />
                  ) : (
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Enter UPI Virtual Private Address (VPA)
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          value={upiDetails.upiId}
                          onChange={(e) => setUpiDetails({ ...upiDetails, upiId: e.target.value })}
                          placeholder="e.g. alex.morgan@okaxis"
                          className="w-full bg-white text-sm px-3.5 py-2.5 rounded-xl border border-indigo-200 focus:outline-none focus:border-indigo-600 font-medium"
                        />
                        {validateUpiId(upiDetails.upiId) && (
                          <Badge variant="success" size="sm" className="absolute right-2.5 top-2">
                            Verified VPA
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {formData.paymentMethod === 'NET_BANKING' && (
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Building2 className="w-4 h-4 text-indigo-600" />
                    Select Popular Net Banking Partner
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {['HDFC', 'ICICI', 'SBI', 'AXIS', 'KOTAK', 'YES'].map((bank) => (
                      <button
                        key={bank}
                        type="button"
                        onClick={() => setSelectedBank(bank)}
                        className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-between transition-all ${selectedBank === bank
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow'
                          : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                          }`}
                      >
                        <span>{bank} Bank</span>
                        {selectedBank === bank && <Check className="w-3.5 h-3.5" />}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {formData.paymentMethod === 'WALLET' && (
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Wallet className="w-4 h-4 text-indigo-600" />
                    Choose Express Digital Wallet
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    {['Apple Pay', 'Google Pay', 'Paytm Wallet', 'PhonePe Wallet'].map((w) => (
                      <button
                        key={w}
                        type="button"
                        onClick={() => setSelectedWallet(w)}
                        className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-between transition-all ${selectedWallet === w
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow'
                          : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                          }`}
                      >
                        <span>{w}</span>
                        {selectedWallet === w && <Check className="w-3.5 h-3.5" />}
                      </button>
                    ))}
                  </div>
                </div>
              )}

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
              {/* 
              Security Banner
              <div className="p-3 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-between text-[11px] text-slate-600 font-medium">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>256-Bit SSL Encrypted & PCI-DSS Compliant</span>
                </div>
                <span className="font-extrabold text-indigo-700">Shopora Pay</span>
              </div> */}
            </div>
          )}
        </form>
      </Flyout>

      {/* 3D Secure / OTP Verification Authorization Modal */}
      {showOtpModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 p-6 space-y-5 relative animate-in fade-in zoom-in-95 duration-200">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center mx-auto text-indigo-600">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-black text-slate-900">
                Shopora 3D Secure Authorization
              </h3>
              <p className="text-xs text-slate-500">
                Enter your 6-digit banking security code to authorize{' '}
                <strong className="text-slate-900">{formatCurrency(subtotal)}</strong>
              </p>
            </div>

            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center gap-2 font-medium">
              <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
              <span>
                Simulated Gateway Test Code: <strong className="font-bold underline">123456</strong>
              </span>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700 text-center uppercase tracking-wider">
                Enter 6-Digit Security Code (OTP)
              </label>
              <input
                type="text"
                maxLength={6}
                value={otpInput}
                onChange={(e) => setOtpInput(e.target.value)}
                className="w-full text-center text-2xl font-mono tracking-[0.5em] font-black py-3 px-4 rounded-xl border-2 border-indigo-200 focus:border-indigo-600 focus:outline-none bg-slate-50"
              />
              {otpError && (
                <p className="text-xs font-bold text-red-600 text-center">{otpError}</p>
              )}
            </div>

            <div className="flex items-center justify-between text-xs text-slate-500 font-medium pt-1">
              <span>Resend code in 0:28</span>
              <button
                type="button"
                onClick={() => setOtpInput('123456')}
                className="text-indigo-600 font-bold hover:underline flex items-center gap-1"
              >
                <RefreshCw className="w-3 h-3" /> Resend Code
              </button>
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                size="md"
                className="w-full"
                onClick={() => setShowOtpModal(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="primary"
                size="md"
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
                isLoading={isVerifyingOtp}
                onClick={handleVerifyOtp}
              >
                Verify & Pay
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
});

CheckoutModal.displayName = 'CheckoutModal';
