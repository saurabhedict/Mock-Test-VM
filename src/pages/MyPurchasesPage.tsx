import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ShoppingBag, CheckCircle2, Calendar, Receipt, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import api from "@/services/api";
import { formatPurchaseValidityLabel, isPurchaseActive } from "@/lib/planValidity";

interface Purchase {
  _id: string;
  featureId: string;
  featureName: string;
  amount: number;
  paymentId: string;
  orderId: string;
  createdAt: string;
  validityMode?: "fixed_date" | "duration" | null;
  fixedExpiryDate?: string | null;
  validityValue?: number | null;
  validityUnit?: "months" | "years" | null;
  accessExpiresAt?: string | null;
}

export default function MyPurchasesPage() {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/payments/my-purchases")
      .then(({ data }) => setPurchases(data.payments))
      .catch(() => toast.error("Failed to load purchases"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container py-10 max-w-3xl">
        <div className="flex items-center gap-3 mb-8">
          <ShoppingBag className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-display font-bold text-foreground">My Purchases</h1>
        </div>

        {loading ? (
          <div className="space-y-4">
            {[1, 2].map((i) => (
              <div key={i} className="h-24 rounded-xl bg-muted animate-pulse" />
            ))}
          </div>
        ) : purchases.length === 0 ? (
          <div className="text-center py-20">
            <ShoppingBag className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-foreground">No purchases yet</h2>
            <p className="text-sm text-muted-foreground mt-1">Browse our services and unlock premium features.</p>
            <Link to="/services" className="mt-4 inline-block text-primary hover:underline text-sm font-medium">
              View Services →
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {purchases.map((p) => (
              <div key={p._id} className="rounded-xl border border-border bg-card p-6 shadow-card">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">{p.featureName}</h3>
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(p.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                        </span>
                        <span className="flex items-center gap-1">
                          <Receipt className="h-3 w-3" />
                          {p.paymentId}
                        </span>
                      </div>
                      <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-primary/5 px-2.5 py-1 text-[11px] font-medium text-primary">
                        <ShieldCheck className="h-3 w-3" />
                        {formatPurchaseValidityLabel({
                          expiresAt: p.accessExpiresAt,
                          validityMode: p.validityMode,
                          fixedExpiryDate: p.fixedExpiryDate,
                          validityValue: p.validityValue,
                          validityUnit: p.validityUnit,
                        })}
                      </div>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-bold text-foreground">₹{p.amount.toLocaleString()}</p>
                    <span className={`text-xs font-medium ${isPurchaseActive({ expiresAt: p.accessExpiresAt }) ? "text-green-600" : "text-amber-600"}`}>
                      {isPurchaseActive({ expiresAt: p.accessExpiresAt }) ? "Active" : "Expired"}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}
