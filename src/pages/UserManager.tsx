import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { AxiosError } from "axios";
import api from "@/services/api";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/context/AuthContext";
import { useExams } from "@/hooks/useExams";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Users, ShieldCheck, ShieldOff, Search, ChevronLeft, ChevronRight,
  LayoutDashboard, Loader2, RefreshCw, Crown, GraduationCap,
  CheckCircle2, XCircle, Phone, Mail, Calendar,
  ShoppingBag, Filter, AlertTriangle, X, Home, MapPin, Trash2,
} from "lucide-react";

// ─── Types ─────────────────────────────────────────────────────────────────────

interface UserRow {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  role: "student" | "admin";
  isVerified: boolean;
  examPref?: string;
  profilePhoto?: string;
  pincode?: string;
  city?: string;
  state?: string;
  country?: string;
  purchases: { featureId: string; featureName: string }[];
  createdAt: string;
}

interface PageMeta {
  total: number;
  page: number;
  pages: number;
}

type RoleFilter = "" | "admin" | "student";

function Avatar({ user }: { user: UserRow }) {
  if (user.profilePhoto) {
    return (
      <img
        src={user.profilePhoto}
        alt={user.name}
        className="w-10 h-10 rounded-full object-cover ring-2 ring-border shrink-0"
      />
    );
  }
  const colors = [
    "bg-blue-100 text-blue-700",
    "bg-violet-100 text-violet-700",
    "bg-emerald-100 text-emerald-700",
    "bg-amber-100 text-amber-700",
    "bg-rose-100 text-rose-700",
  ];
  const color = colors[user.name.charCodeAt(0) % colors.length];
  return (
    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${color}`}>
      {user.name.charAt(0).toUpperCase()}
    </div>
  );
}

// ─── Confirm Role Change Dialog ─────────────────────────────────────────────────

function ConfirmRoleModal({
  user,
  newRole,
  onConfirm,
  onCancel,
  loading,
}: {
  user: UserRow;
  newRole: "admin" | "student";
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
}) {
  const isPromoting = newRole === "admin";
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-card border border-border rounded-2xl shadow-2xl p-6 max-w-md w-full animate-in zoom-in-95 duration-200">
        <button onClick={onCancel} aria-label="Close dialog" className="absolute top-4 right-4 text-muted-foreground hover:text-foreground">
          <X className="w-4 h-4" />
        </button>

        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-4 ${isPromoting ? "bg-amber-50 dark:bg-amber-950/30" : "bg-slate-50 dark:bg-slate-800/40"}`}>
          {isPromoting
            ? <Crown className="w-7 h-7 text-amber-500" />
            : <GraduationCap className="w-7 h-7 text-slate-500" />}
        </div>

        <h3 className="text-lg font-bold text-foreground mb-1">
          {isPromoting ? "Grant Admin Access?" : "Revoke Admin Access?"}
        </h3>
        <p className="text-sm text-muted-foreground mb-5 leading-relaxed">
          {isPromoting
            ? <>You're about to give <strong className="text-foreground">{user.name}</strong> full admin privileges. They will be able to manage tests, plans, notifications, and other users.</>
            : <>You're about to remove admin access from <strong className="text-foreground">{user.name}</strong>. They will revert to a regular student account.</>}
        </p>

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2.5 rounded-xl border border-border text-sm font-medium text-muted-foreground hover:bg-muted/40 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-60 ${
              isPromoting
                ? "bg-amber-500 hover:bg-amber-600 text-white"
                : "bg-slate-600 hover:bg-slate-700 text-white dark:bg-slate-700 dark:hover:bg-slate-600"
            }`}
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {isPromoting ? "Yes, Make Admin" : "Yes, Remove Admin"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ConfirmDeleteModal({
  user,
  onConfirm,
  onCancel,
  loading,
}: {
  user: UserRow;
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-card border border-border rounded-2xl shadow-2xl p-6 max-w-md w-full animate-in zoom-in-95 duration-200">
        <button onClick={onCancel} aria-label="Close dialog" className="absolute top-4 right-4 text-muted-foreground hover:text-foreground">
          <X className="w-4 h-4" />
        </button>

        <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4 bg-red-50 dark:bg-red-950/30">
          <Trash2 className="w-7 h-7 text-red-500" />
        </div>

        <h3 className="text-lg font-bold text-foreground mb-1">Delete User Account?</h3>
        <p className="text-sm text-muted-foreground mb-5 leading-relaxed">
          <strong className="text-foreground">{user.name}</strong> will be removed permanently. Their attempts,
          payment records, and AI chat sessions will be deleted as part of the cleanup.
        </p>

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2.5 rounded-xl border border-border text-sm font-medium text-muted-foreground hover:bg-muted/40 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-red-600 hover:bg-red-700 text-white transition-all disabled:opacity-60"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            Delete User
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── User Row Card ─────────────────────────────────────────────────────────────

function UserCard({
  user,
  currentUserId,
  examLabel,
  onRoleChange,
  onDelete,
}: {
  user: UserRow;
  currentUserId: string;
  examLabel: string;
  onRoleChange: (user: UserRow, role: "admin" | "student") => void;
  onDelete: (user: UserRow) => void;
}) {
  const isCurrentUser = user._id === currentUserId;
  const isAdmin = user.role === "admin";
  const locationParts = [user.city, user.state, user.country].filter(Boolean);

  return (
    <div className={`group relative rounded-2xl border bg-card p-4 hover:shadow-md transition-all ${
      isAdmin ? "border-amber-200 dark:border-amber-800/50 ring-1 ring-amber-100 dark:ring-amber-900/30" : "border-border"
    }`}>
      {isAdmin && (
        <div className="absolute top-0 left-0 right-0 h-0.5 rounded-t-2xl bg-gradient-to-r from-amber-300 via-amber-400 to-orange-400" />
      )}

      <div className="flex items-start gap-3">
        <Avatar user={user} />

        <div className="flex-1 min-w-0">
          {/* Name + role badge */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm text-foreground truncate">{user.name}</span>
            {isAdmin && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-800 uppercase tracking-wide">
                <Crown className="w-2.5 h-2.5" /> Admin
              </span>
            )}
            {isCurrentUser && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 font-semibold">You</span>
            )}
          </div>

          {/* Email */}
          <p className="text-xs text-muted-foreground mt-0.5 truncate flex items-center gap-1">
            <Mail className="w-3 h-3 shrink-0" /> {user.email}
          </p>

          {/* Meta row */}
          <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2">
            {user.phone && (
              <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                <Phone className="w-3 h-3" /> {user.phone}
              </span>
            )}
            <span className="text-[11px] text-muted-foreground flex items-center gap-1">
              {user.isVerified
                ? <><CheckCircle2 className="w-3 h-3 text-emerald-500" /> Verified</>
                : <><XCircle className="w-3 h-3 text-red-400" /> Unverified</>}
            </span>
            {user.purchases?.length > 0 && (
              <span className="text-[11px] text-violet-600 dark:text-violet-400 flex items-center gap-1 font-medium">
                <ShoppingBag className="w-3 h-3" /> {user.purchases.length} purchase{user.purchases.length !== 1 ? "s" : ""}
              </span>
            )}
            {user.examPref && (
              <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                <GraduationCap className="w-3 h-3" /> {examLabel}
              </span>
            )}
            {(locationParts.length > 0 || user.pincode) && (
              <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                {[locationParts.join(", "), user.pincode].filter(Boolean).join(" • ")}
              </span>
            )}
            <span className="text-[11px] text-muted-foreground flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {new Date(user.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
            </span>
          </div>
        </div>

        {/* Role toggle */}
        <div className="shrink-0 self-center flex flex-col gap-2">
          {isAdmin ? (
            <button
              onClick={() => onRoleChange(user, "student")}
              disabled={isCurrentUser}
              title={isCurrentUser ? "Cannot remove your own admin role" : "Remove admin access"}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/40 hover:bg-red-50 hover:border-red-200 hover:text-red-600 dark:hover:bg-red-950/20 dark:hover:border-red-800 dark:hover:text-red-400 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ShieldOff className="w-3.5 h-3.5" />
              Remove Admin
            </button>
          ) : (
            <button
              onClick={() => onRoleChange(user, "admin")}
              title="Grant admin access"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-amber-200 dark:border-amber-800 text-xs font-semibold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 hover:bg-amber-100 dark:hover:bg-amber-950/50 transition-all"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              Make Admin
            </button>
          )}
          <button
            onClick={() => onDelete(user)}
            disabled={isCurrentUser}
            title={isCurrentUser ? "Use profile settings to delete your own account" : "Delete user"}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-red-200 text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 dark:bg-red-950/20 dark:border-red-900/40 dark:hover:bg-red-950/30 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function UserManager() {
  const { toast } = useToast();
  const { user: currentUser } = useAuth();
  const { exams } = useExams();

  const [users, setUsers] = useState<UserRow[]>([]);
  const [meta, setMeta] = useState<PageMeta>({ total: 0, page: 1, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("");
  const [page, setPage] = useState(1);

  // Role change confirm modal state
  const [pendingChange, setPendingChange] = useState<{ user: UserRow; newRole: "admin" | "student" } | null>(null);
  const [changingRole, setChangingRole] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<UserRow | null>(null);
  const [deletingUser, setDeletingUser] = useState(false);

  // Stats
  const [stats, setStats] = useState({ total: 0, admins: 0, students: 0, verified: 0 });
  const examLabelMap = useMemo(
    () => new Map(exams.map((exam) => [exam.examId, exam.shortName || exam.examName])),
    [exams]
  );

  // Debounce search
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleSearchChange = (val: string) => {
    setSearch(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(val);
      setPage(1);
    }, 350);
  };

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = { page, limit: 20 };
      if (debouncedSearch) params.search = debouncedSearch;
      if (roleFilter) params.role = roleFilter;

      const { data } = await api.get("/admin/users", { params });
      setUsers(data.users || []);
      setMeta({ total: data.total, page: data.page, pages: data.pages });

      // Fetch stats separately only on first load or after role change
      if (page === 1 && !debouncedSearch && !roleFilter) {
        const [adminRes, verifiedRes] = await Promise.all([
          api.get("/admin/users", { params: { role: "admin", limit: 1 } }),
          api.get("/admin/users", { params: { verified: true, limit: 1 } }),
        ]);
        setStats({
          total: data.total,
          admins: adminRes.data.total,
          students: data.total - adminRes.data.total,
          verified: verifiedRes.data.total,
        });
      }
    } catch {
      toast({ title: "Failed to load users", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, page, roleFilter, toast]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  // Initial stats fetch
  useEffect(() => {
    async function loadStats() {
      try {
        const [allRes, verifiedRes, adminRes] = await Promise.all([
          api.get("/admin/users", { params: { limit: 1 } }),
          api.get("/admin/users", { params: { verified: true, limit: 1 } }),
          api.get("/admin/users", { params: { role: "admin", limit: 1 } }),
        ]);
        setStats({
          total: allRes.data.total,
          admins: adminRes.data.total,
          students: allRes.data.total - adminRes.data.total,
          verified: verifiedRes.data.total,
        });
      } catch {
        toast({ title: "Failed to load user statistics", variant: "destructive" });
      }
    }
    loadStats();
  }, [toast]);

  const handleRoleChange = async () => {
    if (!pendingChange) return;
    setChangingRole(true);
    try {
      await api.put(`/admin/users/${pendingChange.user._id}/role`, { role: pendingChange.newRole });
      toast({
        title: pendingChange.newRole === "admin"
          ? `✅ ${pendingChange.user.name} is now an Admin`
          : `${pendingChange.user.name} is now a Student`,
      });
      // Update in-place without full reload
      setUsers((prev) =>
        prev.map((u) => u._id === pendingChange.user._id ? { ...u, role: pendingChange.newRole } : u)
      );
      setStats((s) => ({
        ...s,
        admins: pendingChange.newRole === "admin" ? s.admins + 1 : s.admins - 1,
        students: pendingChange.newRole === "student" ? s.students + 1 : s.students - 1,
      }));
      setPendingChange(null);
    } catch (err) {
      const message =
        err instanceof AxiosError
          ? (err as AxiosError<{ message?: string }>).response?.data?.message || "Failed to update role"
          : "Failed to update role";
      toast({ title: message, variant: "destructive" });
    } finally {
      setChangingRole(false);
    }
  };

  const clearFilters = () => {
    setSearch("");
    setDebouncedSearch("");
    setRoleFilter("");
    setPage(1);
  };

  const handleDeleteUser = async () => {
    if (!pendingDelete) return;
    setDeletingUser(true);
    try {
      const { data } = await api.delete(`/admin/users/${pendingDelete._id}`);
      setUsers((prev) => prev.filter((entry) => entry._id !== pendingDelete._id));
      setMeta((prev) => ({
        ...prev,
        total: Math.max(prev.total - 1, 0),
      }));
      setStats((prev) => ({
        total: Math.max(prev.total - 1, 0),
        admins: pendingDelete.role === "admin" ? Math.max(prev.admins - 1, 0) : prev.admins,
        students: pendingDelete.role === "student" ? Math.max(prev.students - 1, 0) : prev.students,
        verified: pendingDelete.isVerified ? Math.max(prev.verified - 1, 0) : prev.verified,
      }));
      toast({ title: data?.message || "User deleted successfully" });
      setPendingDelete(null);
    } catch (err) {
      const message =
        err instanceof AxiosError
          ? (err as AxiosError<{ message?: string }>).response?.data?.message || "Failed to delete user"
          : "Failed to delete user";
      toast({ title: message, variant: "destructive" });
    } finally {
      setDeletingUser(false);
    }
  };

  const hasFilters = debouncedSearch || roleFilter;

  return (
    <>
      {/* Confirm modal */}
      {pendingChange && (
        <ConfirmRoleModal
          user={pendingChange.user}
          newRole={pendingChange.newRole}
          onConfirm={handleRoleChange}
          onCancel={() => setPendingChange(null)}
          loading={changingRole}
        />
      )}
      {pendingDelete && (
        <ConfirmDeleteModal
          user={pendingDelete}
          onConfirm={handleDeleteUser}
          onCancel={() => setPendingDelete(null)}
          loading={deletingUser}
        />
      )}

      <div className="container mx-auto p-6 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">

        {/* Page header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              to="/admin"
              className="p-2 rounded-xl border border-border text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
            >
              <LayoutDashboard className="w-4 h-4" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">User Manager</h1>
              <p className="text-sm text-muted-foreground">View all registered users and manage admin access</p>
            </div>
          </div>
          <div className="flex gap-2 self-start sm:self-auto">
            <Link
              to="/"
              className="flex items-center gap-2 px-4 py-2 rounded-xl border border-border text-sm font-medium text-muted-foreground hover:bg-muted/40 transition-colors"
            >
              <Home className="w-4 h-4" />
              Home
            </Link>
            <button
              onClick={fetchUsers}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 rounded-xl border border-border text-sm font-medium text-muted-foreground hover:bg-muted/40 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* Stats strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Total Users",    value: stats.total,    icon: <Users className="w-4 h-4" />,       accent: "border-l-blue-500",   click: () => { setRoleFilter(""); setPage(1); } },
            { label: "Admins",         value: stats.admins,   icon: <Crown className="w-4 h-4" />,       accent: "border-l-amber-400",  click: () => { setRoleFilter("admin"); setPage(1); } },
            { label: "Students",       value: stats.students, icon: <GraduationCap className="w-4 h-4" />, accent: "border-l-violet-500", click: () => { setRoleFilter("student"); setPage(1); } },
            { label: "Verified",       value: stats.verified, icon: <CheckCircle2 className="w-4 h-4" />, accent: "border-l-emerald-500", click: undefined },
          ].map((s) => (
            <Card
              key={s.label}
              onClick={s.click}
              className={`hover:shadow-md transition-all border-l-4 ${s.accent} ${s.click ? "cursor-pointer hover:scale-[1.01]" : ""}`}
            >
              <CardHeader className="flex flex-row items-center justify-between pb-1 pt-4 px-4 space-y-0">
                <CardTitle className="text-xs font-medium text-muted-foreground">{s.label}</CardTitle>
                <span className="text-muted-foreground">{s.icon}</span>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <div className="text-2xl font-bold text-foreground">{s.value}</div>
                {s.click && <p className="text-[10px] text-muted-foreground mt-0.5">Click to filter</p>}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Search + filter bar */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              className="w-full rounded-xl border border-input bg-background pl-9 pr-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
              placeholder="Search by name or email…"
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
            />
            {search && (
              <button onClick={() => handleSearchChange("")} aria-label="Clear search" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="flex gap-2">
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <select
                value={roleFilter}
                onChange={(e) => { setRoleFilter(e.target.value as RoleFilter); setPage(1); }}
                aria-label="Filter users by role"
                className="pl-9 pr-4 py-2.5 rounded-xl border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 appearance-none cursor-pointer"
              >
                <option value="">All Roles</option>
                <option value="admin">Admins only</option>
                <option value="student">Students only</option>
              </select>
            </div>

            {hasFilters && (
              <button
                onClick={clearFilters}
                className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl border border-border text-sm text-muted-foreground hover:bg-muted/40 transition-colors"
              >
                <X className="w-3.5 h-3.5" /> Clear
              </button>
            )}
          </div>
        </div>

        {/* Results info */}
        {!loading && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {hasFilters
                ? <><strong className="text-foreground">{meta.total}</strong> result{meta.total !== 1 ? "s" : ""} found</>
                : <><strong className="text-foreground">{meta.total}</strong> total user{meta.total !== 1 ? "s" : ""}</>}
            </p>
            {meta.pages > 1 && (
              <p className="text-xs text-muted-foreground">Page {meta.page} of {meta.pages}</p>
            )}
          </div>
        )}

        {/* Users list */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
            <p className="text-muted-foreground text-sm">Loading users…</p>
          </div>
        ) : users.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4 border-2 border-dashed border-border rounded-2xl">
            <Users className="w-10 h-10 text-muted-foreground/30" />
            <div className="text-center">
              <p className="font-semibold text-foreground">No users found</p>
              <p className="text-sm text-muted-foreground mt-1">
                {hasFilters ? "Try adjusting your search or filters" : "No registered users yet"}
              </p>
            </div>
            {hasFilters && (
              <button onClick={clearFilters} className="text-sm text-primary hover:underline">Clear filters</button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {users.map((user) => (
              <UserCard
                key={user._id}
                user={user}
                currentUserId={currentUser?._id || ""}
                examLabel={user.examPref ? examLabelMap.get(user.examPref) || user.examPref : "—"}
                onRoleChange={(u, role) => setPendingChange({ user: u, newRole: role })}
                onDelete={(u) => setPendingDelete(u)}
              />
            ))}
          </div>
        )}

        {/* Pagination */}
        {meta.pages > 1 && !loading && (
          <div className="flex items-center justify-center gap-2">
            <button
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-border text-sm font-medium text-muted-foreground hover:bg-muted/40 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4" /> Prev
            </button>

            <div className="flex gap-1">
              {Array.from({ length: Math.min(5, meta.pages) }, (_, i) => {
                const p = meta.pages <= 5 ? i + 1 : page <= 3 ? i + 1 : page >= meta.pages - 2 ? meta.pages - 4 + i : page - 2 + i;
                return (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    aria-label={`Go to page ${p}`}
                    aria-current={p === page ? "page" : undefined}
                    className={`w-9 h-9 rounded-xl text-sm font-medium transition-colors ${
                      p === page
                        ? "bg-primary text-primary-foreground"
                        : "border border-border text-muted-foreground hover:bg-muted/40"
                    }`}
                  >
                    {p}
                  </button>
                );
              })}
            </div>

            <button
              disabled={page === meta.pages}
              onClick={() => setPage((p) => p + 1)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-border text-sm font-medium text-muted-foreground hover:bg-muted/40 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Next <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Safety notice */}
        <div className="flex items-start gap-2 text-xs text-muted-foreground bg-amber-50 dark:bg-amber-950/20 rounded-xl px-4 py-3 border border-amber-200 dark:border-amber-800/40">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
          <span>
            Admins have full access to the admin panel including user data, tests, and billing. Only promote trusted accounts.
            You cannot remove your own admin role.
          </span>
        </div>
      </div>
    </>
  );
}
