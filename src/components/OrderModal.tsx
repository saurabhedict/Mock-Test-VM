import { useState } from "react";
import { X, ShoppingCart, Tag, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import api from "@/services/api";

interface Props {
  open: boolean;
  onClose: () => void;
  onProceed: (finalPrice: number, couponCode?: string) => void;
  featureId: string;
  featureName: string;
  price: number;
  loading: boolean;
}

export default function OrderModal({ open, onClose, onProceed, featureId, featureName, price, loading }: Props) {
  const [couponCode, setCouponCode] = useState("");
  const [couponLoading, setCouponLoading] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState<{
    code: string;
    discountAmount: number;
    finalPrice: number;
  } | null>(null);

  if (!open) return null;

  const basePrice = Math.round(price / 1.18);
  const gst = price - basePrice;
  const discountAmount = appliedCoupon?.discountAmount || 0;
  const finalTotal = appliedCoupon?.finalPrice || price;

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) {
      toast.error("Please enter a coupon code");
      return;
    }
    setCouponLoading(true);
    try {
      const { data } = await api.post("/coupons/validate", {
        code: couponCode.trim(),
        featureId,
        price,
      });
      if (data.success) {
        setAppliedCoupon(data.coupon);
        toast.success(
          `Coupon applied! You save ₹${data.coupon.discountAmount.toLocaleString()}`
        );
      }
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || "Invalid coupon code";
      toast.error(msg);
      setAppliedCoupon(null);
    } finally {
      setCouponLoading(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode("");
  };

  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
        onClick={onClose}
      >
        <div
          className="relative w-full max-w-sm bg-card rounded-2xl shadow-2xl border border-border overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-border">
            <h2 className="text-lg font-bold text-foreground">Order Details</h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close order modal"
              className="p-1.5 rounded-lg hover:bg-muted transition-colors"
            >
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>

          {/* Body */}
          <div className="px-6 py-5 space-y-5">

            {/* Service Card */}
            <div className="flex items-center gap-4 p-3 rounded-xl bg-muted/50 border border-border">
              <div className="h-14 w-14 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <ShoppingCart className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground leading-snug">{featureName}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Vidyarthi Mitra Premium</p>
              </div>
            </div>

            {/* Coupon Box */}
            <div>
              <p className="text-xs font-medium text-foreground mb-2 flex items-center gap-1.5">
                <Tag className="h-3.5 w-3.5 text-primary" />
                Have a discount coupon?
              </p>
              {appliedCoupon ? (
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800">
                  <span className="flex items-center gap-2 text-sm font-medium text-green-700 dark:text-green-400">
                    <CheckCircle2 className="h-4 w-4" />
                    {appliedCoupon.code} applied!
                  </span>
                  <button
                    type="button"
                    onClick={handleRemoveCoupon}
                    className="text-xs text-red-500 hover:underline"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                    onKeyDown={(e) => e.key === "Enter" && handleApplyCoupon()}
                    placeholder="Enter Code Here"
                    className="flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring uppercase"
                  />
                 <Button
                   size="sm"
                   className="px-4 bg-primary text-primary-foreground hover:bg-primary/90"
                   onClick={handleApplyCoupon}
                   disabled={couponLoading}
>
                   {couponLoading ? "..." : "Apply"}
                 </Button>
                </div>
              )}
            </div>

            {/* Price Breakdown */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="text-foreground">₹ {basePrice.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">GST (18%)</span>
                <span className="text-foreground">₹ {gst.toLocaleString()}</span>
              </div>
              {discountAmount > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Discount</span>
                  <span className="text-green-600 font-medium">
                    - ₹ {discountAmount.toLocaleString()}
                  </span>
                </div>
              )}
              <div className="h-px bg-border" />
              <div className="flex items-center justify-between">
                <span className="font-bold text-foreground">Total</span>
                <div className="text-right">
                  {discountAmount > 0 && (
                    <span className="text-xs text-muted-foreground line-through mr-2">
                      ₹{price.toLocaleString()}
                    </span>
                  )}
                  <span className="font-bold text-lg text-foreground">
                    ₹ {finalTotal.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 pb-6">
            <Button
              className="w-full h-11 text-base font-semibold"
              onClick={() => onProceed(finalTotal, appliedCoupon?.code)}
              disabled={loading}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <div className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                  Processing...
                </span>
              ) : (
                "Proceed to Checkout"
              )}
            </Button>
            <p className="text-[10px] text-muted-foreground text-center mt-2">
              Secured by Razorpay • 100% Safe & Encrypted
            </p>
          </div>
        </div>
      </div>
    </>
  );
}