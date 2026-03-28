import { useCallback, useEffect, useMemo, useState } from "react";
import { AxiosError } from "axios";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  BadgePercent,
  Calendar,
  Check,
  Copy,
  LayoutDashboard,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Tag,
  TicketPercent,
  ToggleLeft,
  ToggleRight,
  Trash2,
  X,
} from "lucide-react";
import api from "@/services/api";
import { useToast } from "@/components/ui/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { services } from "@/data/services";

type DiscountType = "percent" | "flat";

interface Coupon {
  _id: string;
  code: string;
  discountType: DiscountType;
  discountValue: number;
  maxUses: number;
  usedCount: number;
  expiresAt: string | null;
  isActive: boolean;
  applicableFeatures: string[];
  createdAt: string;
}

interface CouponPayload {
  code: string;
  discountType: DiscountType;
  discountValue: number;
  maxUses: number;
  expiresAt: string;
  applicableFeatures: string[];
}

interface ApiErrorResponse {
  message?: string;
}

const SERVICE_OPTIONS = services.map((service) => ({
  id: service.serviceId,
  label: service.serviceName,
}));

const emptyForm = (): CouponPayload => ({
  code: "",
  discountType: "percent",
  discountValue: 10,
  maxUses: 100,
  expiresAt: "",
  applicableFeatures: [],
});

const formatDateTime = (value: string | null) => {
  if (!value) return "No expiry";
  return new Date(value).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const toInputDateTime = (value: string | null) => {
  if (!value) return "";
  const date = new Date(value);
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60_000);
  return local.toISOString().slice(0, 16);
};

export default function CouponManager() {
  const { toast } = useToast();
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingCouponId, setEditingCouponId] = useState<string | null>(null);
  const [form, setForm] = useState<CouponPayload>(emptyForm());

  const editingCoupon = useMemo(
    () => coupons.find((coupon) => coupon._id === editingCouponId) || null,
    [coupons, editingCouponId]
  );

  const resetForm = () => {
    setEditingCouponId(null);
    setForm(emptyForm());
  };

  const fetchCoupons = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/admin/coupons");
      setCoupons(data.coupons || []);
    } catch {
      toast({ title: "Failed to load coupons", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchCoupons();
  }, [fetchCoupons]);

  const activeCoupons = coupons.filter((coupon) => coupon.isActive).length;
  const totalUses = coupons.reduce((sum, coupon) => sum + coupon.usedCount, 0);
  const expiringSoon = coupons.filter((coupon) => {
    if (!coupon.expiresAt) return false;
    const diff = new Date(coupon.expiresAt).getTime() - Date.now();
    return diff > 0 && diff <= 7 * 24 * 60 * 60 * 1000;
  }).length;

  const buildPayload = () => ({
    code: form.code.trim().toUpperCase(),
    discountType: form.discountType,
    discountValue: Number(form.discountValue),
    maxUses: Number(form.maxUses),
    expiresAt: form.expiresAt || null,
    applicableFeatures: form.applicableFeatures,
  });

  const handleSubmit = async () => {
    setSaving(true);
    try {
      const payload = buildPayload();
      if (editingCouponId) {
        await api.put(`/admin/coupons/${editingCouponId}`, payload);
        toast({ title: "Coupon updated successfully" });
      } else {
        await api.post("/admin/coupons", payload);
        toast({ title: "Coupon created successfully" });
      }
      resetForm();
      fetchCoupons();
    } catch (error) {
      const message =
        error instanceof AxiosError<ApiErrorResponse>
          ? error.response?.data?.message || "Failed to save coupon"
          : "Failed to save coupon";
      toast({ title: message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (coupon: Coupon) => {
    setEditingCouponId(coupon._id);
    setForm({
      code: coupon.code,
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
      maxUses: coupon.maxUses,
      expiresAt: toInputDateTime(coupon.expiresAt),
      applicableFeatures: coupon.applicableFeatures,
    });
  };

  const handleToggleFeature = (featureId: string) => {
    setForm((current) => ({
      ...current,
      applicableFeatures: current.applicableFeatures.includes(featureId)
        ? current.applicableFeatures.filter((id) => id !== featureId)
        : [...current.applicableFeatures, featureId],
    }));
  };

  const handleToggleStatus = async (couponId: string) => {
    try {
      await api.patch(`/admin/coupons/${couponId}/status`);
      toast({ title: "Coupon status updated" });
      fetchCoupons();
    } catch {
      toast({ title: "Failed to update coupon status", variant: "destructive" });
    }
  };

  const handleDelete = async (couponId: string) => {
    try {
      await api.delete(`/admin/coupons/${couponId}`);
      toast({ title: "Coupon deleted successfully" });
      if (editingCouponId === couponId) resetForm();
      fetchCoupons();
    } catch {
      toast({ title: "Failed to delete coupon", variant: "destructive" });
    }
  };

  const handleCopyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      toast({ title: `${code} copied to clipboard` });
    } catch {
      toast({ title: "Could not copy coupon code", variant: "destructive" });
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            to="/admin"
            className="p-2 rounded-xl border border-border text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
          >
            <LayoutDashboard className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Coupon Manager</h1>
            <p className="text-sm text-muted-foreground">
              Create flexible discount campaigns, control usage limits, and manage expiry.
            </p>
          </div>
        </div>
        <button
          onClick={fetchCoupons}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-xl border border-border text-sm font-medium text-muted-foreground hover:bg-muted/40 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Coupons", value: coupons.length, icon: <Tag className="w-4 h-4" />, accent: "border-l-blue-500" },
          { label: "Active Coupons", value: activeCoupons, icon: <Check className="w-4 h-4" />, accent: "border-l-emerald-500" },
          { label: "Uses Redeemed", value: totalUses, icon: <TicketPercent className="w-4 h-4" />, accent: "border-l-amber-500" },
          { label: "Expiring Soon", value: expiringSoon, icon: <Calendar className="w-4 h-4" />, accent: "border-l-rose-500" },
        ].map((stat) => (
          <Card key={stat.label} className={`border-l-4 ${stat.accent}`}>
            <CardHeader className="flex flex-row items-center justify-between pb-1 pt-4 px-4 space-y-0">
              <CardTitle className="text-xs font-medium text-muted-foreground">{stat.label}</CardTitle>
              <span className="text-muted-foreground">{stat.icon}</span>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="text-2xl font-bold text-foreground">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[420px_minmax(0,1fr)] gap-6 items-start">
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle>{editingCoupon ? `Edit ${editingCoupon.code}` : "Create Coupon"}</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Set discount type, usage cap, expiry, and optionally target specific services.
              </p>
            </div>
            {editingCoupon && (
              <button
                onClick={resetForm}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Cancel
              </button>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                Coupon Code
              </label>
              <div className="flex gap-2">
                <input
                  value={form.code}
                  onChange={(e) => setForm((current) => ({ ...current, code: e.target.value.toUpperCase().replace(/\s+/g, "") }))}
                  disabled={Boolean(editingCoupon)}
                  placeholder="e.g. SUMMER50"
                  className="w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm font-mono text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all disabled:opacity-60"
                />
                {!editingCoupon && (
                  <button
                    type="button"
                    onClick={() =>
                      setForm((current) => ({
                        ...current,
                        code: `SAVE${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
                      }))
                    }
                    className="px-3 rounded-xl border border-border text-xs font-medium text-muted-foreground hover:bg-muted/40"
                  >
                    Auto
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                  Discount Type
                </label>
                <select
                  value={form.discountType}
                  onChange={(e) => setForm((current) => ({ ...current, discountType: e.target.value as DiscountType }))}
                  aria-label="Coupon discount type"
                  className="w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                >
                  <option value="percent">Percent</option>
                  <option value="flat">Flat amount</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                  Discount Value
                </label>
                <input
                  type="number"
                  min={1}
                  max={form.discountType === "percent" ? 100 : undefined}
                  value={form.discountValue}
                  onChange={(e) => setForm((current) => ({ ...current, discountValue: Number(e.target.value) }))}
                  className="w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                  Max Uses
                </label>
                <input
                  type="number"
                  min={1}
                  value={form.maxUses}
                  onChange={(e) => setForm((current) => ({ ...current, maxUses: Number(e.target.value) }))}
                  className="w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                  Expires At
                </label>
                <input
                  type="datetime-local"
                  value={form.expiresAt}
                  onChange={(e) => setForm((current) => ({ ...current, expiresAt: e.target.value }))}
                  className="w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Applicable Services
              </label>
              <div className="rounded-2xl border border-border p-3 space-y-2 max-h-56 overflow-y-auto">
                <button
                  type="button"
                  onClick={() => setForm((current) => ({ ...current, applicableFeatures: [] }))}
                  className={`w-full text-left px-3 py-2 rounded-xl text-sm transition-colors ${
                    form.applicableFeatures.length === 0
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted/40 text-foreground hover:bg-muted"
                  }`}
                >
                  All services
                </button>
                {SERVICE_OPTIONS.map((service) => {
                  const selected = form.applicableFeatures.includes(service.id);
                  return (
                    <button
                      key={service.id}
                      type="button"
                      onClick={() => handleToggleFeature(service.id)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm transition-colors ${
                        selected
                          ? "bg-primary/10 text-primary border border-primary/20"
                          : "bg-muted/30 text-foreground hover:bg-muted/60 border border-transparent"
                      }`}
                    >
                      <span>{service.label}</span>
                      {selected ? <Check className="w-4 h-4" /> : null}
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Leave all services unselected to make this coupon valid everywhere.
              </p>
            </div>

            <button
              type="button"
              onClick={handleSubmit}
              disabled={saving}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 disabled:opacity-60 transition-all"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : editingCoupon ? <Pencil className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              {saving ? "Saving..." : editingCoupon ? "Save Changes" : "Create Coupon"}
            </button>
          </CardContent>
        </Card>

        <div className="space-y-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-24 gap-3 border border-border rounded-2xl">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
              <p className="text-muted-foreground text-sm">Loading coupons...</p>
            </div>
          ) : coupons.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 gap-4 border-2 border-dashed border-border rounded-2xl">
              <BadgePercent className="w-10 h-10 text-muted-foreground/30" />
              <div className="text-center">
                <p className="font-semibold text-foreground">No coupons yet</p>
                <p className="text-sm text-muted-foreground mt-1">Create your first coupon campaign from the panel on the left.</p>
              </div>
            </div>
          ) : (
            coupons.map((coupon) => {
              const usagePercent = Math.min(100, Math.round((coupon.usedCount / coupon.maxUses) * 100));
              return (
                <Card key={coupon._id} className={`overflow-hidden border ${coupon.isActive ? "border-border" : "border-red-200 dark:border-red-900/40 opacity-80"}`}>
                  <CardContent className="p-5 space-y-4">
                    <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-muted text-foreground font-mono text-sm">
                            <Tag className="w-3.5 h-3.5" />
                            {coupon.code}
                          </span>
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                            coupon.isActive
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-300 dark:border-emerald-900/40"
                              : "bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/20 dark:text-rose-300 dark:border-rose-900/40"
                          }`}>
                            {coupon.isActive ? "Active" : "Inactive"}
                          </span>
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20">
                            {coupon.discountType === "percent" ? `${coupon.discountValue}% off` : `Rs. ${coupon.discountValue} off`}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                          <span>Uses: <strong className="text-foreground">{coupon.usedCount}</strong> / {coupon.maxUses}</span>
                          <span>Expiry: <strong className="text-foreground">{formatDateTime(coupon.expiresAt)}</strong></span>
                          <span>Created: <strong className="text-foreground">{formatDateTime(coupon.createdAt)}</strong></span>
                        </div>
                        <div className="space-y-2">
                          <div className="h-2 rounded-full bg-muted overflow-hidden">
                            <div className="h-full bg-primary rounded-full" style={{ width: `${usagePercent}%` }} />
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Redeemed {usagePercent}% of total allowed uses
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {coupon.applicableFeatures.length === 0 ? (
                            <span className="text-xs px-2 py-1 rounded-full bg-muted text-muted-foreground">All services</span>
                          ) : (
                            coupon.applicableFeatures.map((featureId) => {
                              const service = SERVICE_OPTIONS.find((option) => option.id === featureId);
                              return (
                                <span key={featureId} className="text-xs px-2 py-1 rounded-full bg-muted text-muted-foreground">
                                  {service?.label || featureId}
                                </span>
                              );
                            })
                          )}
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2 lg:justify-end">
                        <button
                          type="button"
                          onClick={() => handleCopyCode(coupon.code)}
                          className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border text-xs font-semibold text-muted-foreground hover:bg-muted/40 transition-colors"
                        >
                          <Copy className="w-3.5 h-3.5" />
                          Copy
                        </button>
                        <button
                          type="button"
                          onClick={() => handleEdit(coupon)}
                          className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border text-xs font-semibold text-muted-foreground hover:bg-muted/40 transition-colors"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(coupon._id)}
                          className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border text-xs font-semibold text-muted-foreground hover:bg-muted/40 transition-colors"
                        >
                          {coupon.isActive ? <ToggleRight className="w-3.5 h-3.5" /> : <ToggleLeft className="w-3.5 h-3.5" />}
                          {coupon.isActive ? "Disable" : "Enable"}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(coupon._id)}
                          className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-red-200 text-red-500 text-xs font-semibold hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Delete
                        </button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </div>

      <div className="flex items-start gap-2 text-xs text-muted-foreground bg-amber-50 dark:bg-amber-950/20 rounded-xl px-4 py-3 border border-amber-200 dark:border-amber-800/40">
        <ArrowLeft className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5 rotate-180" />
        <span>
          Coupons created here work on the live checkout flow immediately. Keep expiry dates realistic and use service targeting when you want campaign-specific discounts.
        </span>
      </div>
    </div>
  );
}
