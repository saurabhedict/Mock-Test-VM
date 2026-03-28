import { useState } from "react";
import { toast } from "sonner";
import api from "@/services/api";

interface PaymentOptions {
  featureId: string;
  featureName: string;
  finalPrice?: number;
  couponCode?: string;
  onSuccess?: (data: PaymentSuccess) => void;
  onFailure?: (reason: string) => void;
}

interface PaymentSuccess {
  orderId: string;
  paymentId: string;
  featureId: string;
  featureName: string;
  amount: number;
}

const loadRazorpayScript = (): Promise<boolean> => {
  return new Promise((resolve) => {
    if ((window as unknown as { Razorpay?: unknown }).Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

export function useRazorpay() {
  const [loading, setLoading] = useState(false);

  const initiatePayment = async ({ featureId, featureName, finalPrice, couponCode, onSuccess, onFailure }: PaymentOptions) => {
    setLoading(true);
    try {
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        toast.error("Failed to load payment gateway. Check your internet connection.");
        setLoading(false);
        return;
      }

      const { data } = await api.post("/payments/create-order", { featureId, finalPrice, couponCode });
      if (!data.success) {
        toast.error(data.message || "Failed to create order");
        setLoading(false);
        return;
      }

      const { order, key, feature } = data;

      const options = {
        key,
        amount: order.amount,
        currency: order.currency,
        name: "Vidyarthi Mitra",
        description: feature.name,
        order_id: order.id,
        image: "/logo.png",
        handler: async (response: {
          razorpay_order_id: string;
          razorpay_payment_id: string;
          razorpay_signature: string;
        }) => {
          try {
            const verifyRes = await api.post("/payments/verify", {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });
            if (verifyRes.data.success) {
              toast.success(`🎉 Payment successful! ${feature.name} is now unlocked.`);
              onSuccess?.(verifyRes.data.payment);
            } else {
              toast.error("Payment verification failed. Contact support.");
              onFailure?.("Verification failed");
            }
          } catch {
            toast.error("Payment verification failed. Please contact support.");
            onFailure?.("Verification error");
          }
        },
        modal: {
          ondismiss: async () => {
            try {
              await api.post("/payments/failure", { orderId: order.id, reason: "Payment cancelled by user" });
            } catch { }
            toast.info("Payment cancelled.");
            onFailure?.("cancelled");
            setLoading(false);
          },
        },
        prefill: { name: "", email: "", contact: "" },
        theme: { color: "#f97316" },
      };

      const razorpay = new (window as unknown as { Razorpay: new (opts: unknown) => { open: () => void; on: (event: string, cb: unknown) => void } }).Razorpay(options);

      razorpay.on("payment.failed", async (response: { error: { description: string; metadata: { order_id: string } } }) => {
        try {
          await api.post("/payments/failure", { orderId: response.error.metadata.order_id, reason: response.error.description });
        } catch { }
        toast.error(`Payment failed: ${response.error.description}`);
        onFailure?.(response.error.description);
        setLoading(false);
      });

      razorpay.open();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || "Payment initiation failed";
      toast.error(msg);
      onFailure?.(msg);
    } finally {
      setLoading(false);
    }
  };

  return { initiatePayment, loading };
}