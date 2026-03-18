import { X, ShoppingCart, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  open: boolean;
  onClose: () => void;
  onProceed: () => void;
  featureName: string;
  price: number;
  loading: boolean;
}

export default function OrderModal({ open, onClose, onProceed, featureName, price, loading }: Props) {
  if (!open) return null;

  const gst = Math.round(price * 0.18);
  const total = price;
  const basePrice = Math.round(price / 1.18);
  const discount = 0;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
        onClick={onClose}
      >
        {/* Modal */}
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
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Enter Code Here"
                  className="flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                />
                <Button size="sm" variant="outline" className="px-4">
                  Apply
                </Button>
              </div>
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
              {discount > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Discount</span>
                  <span className="text-green-600">- ₹ {discount.toLocaleString()}</span>
                </div>
              )}
              <div className="h-px bg-border" />
              <div className="flex items-center justify-between">
                <span className="font-bold text-foreground">Total</span>
                <span className="font-bold text-lg text-foreground">₹ {total.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 pb-6">
            <Button
              className="w-full h-11 text-base font-semibold"
              onClick={onProceed}
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