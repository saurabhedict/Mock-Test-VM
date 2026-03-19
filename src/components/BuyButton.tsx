import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { useRazorpay } from "@/hooks/useRazorpay";
import OrderModal from "@/components/OrderModal";

interface BuyButtonProps {
  featureId: string;
  featureName: string;
  price: number;
  variant?: "default" | "outline" | "ghost";
  className?: string;
  label?: string;
}

export default function BuyButton({
  featureId,
  featureName,
  price,
  variant = "default",
  className = "",
  label = "Buy Now",
}: BuyButtonProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { initiatePayment, loading } = useRazorpay();
  const [modalOpen, setModalOpen] = useState(false);

  const alreadyPurchased = (user as unknown as { purchases?: { featureId: string }[] })
    ?.purchases?.some((p) => p.featureId === featureId);

  const handleClick = () => {
    if (!user) {
      toast.info("Please login to purchase");
      navigate("/login");
      return;
    }
    if (alreadyPurchased) {
      toast.info("You have already purchased this feature!");
      return;
    }
    setModalOpen(true);
  };

  const handleProceed = (finalPrice: number, couponCode?: string) => {
    setModalOpen(false);
    setTimeout(() => {
      initiatePayment({
        featureId,
        featureName,
        finalPrice,
        couponCode,
        onSuccess: () => {
          navigate("/my-purchases");
        },
        onFailure: (reason) => {
          if (reason !== "cancelled") {
            console.error("Payment failed:", reason);
          }
        },
      });
    }, 300);
  };

  if (alreadyPurchased) {
    return (
      <Button variant="outline" className={`w-full ${className} border-green-500 text-green-600`} disabled>
        ✓ Purchased
      </Button>
    );
  }

  return (
    <>
      <Button
        variant={variant}
        className={`w-full ${className}`}
        onClick={handleClick}
        disabled={loading}
      >
        <span className="flex items-center gap-2">
          <ShoppingCart className="h-4 w-4" />
          {label} — ₹{price.toLocaleString()}
        </span>
      </Button>

      <OrderModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onProceed={handleProceed}
        featureId={featureId}
        featureName={featureName}
        price={price}
        loading={loading}
      />
    </>
  );
}