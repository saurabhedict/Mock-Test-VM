import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "@/services/api";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Users, FileText, Activity, ArrowRight, Bell, Trash2, Send, Layers, UserCog, TicketPercent, Home } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

interface AdminStats {
  totalUsers: number;
  totalTests: number;
  totalAttempts: number;
}

interface NotificationItem {
  _id: string;
  type: "info" | "success" | "warning";
  message: string;
  createdAt: string;
}

const AdminDashboard = () => {
  const { toast } = useToast();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [newType, setNewType] = useState<"info" | "success" | "warning">("info");
  const [sendingNotif, setSendingNotif] = useState(false);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const { data } = await api.get("/admin/stats");
        setStats(data);
      } catch (error) {
        console.error("Fetch stats error:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      const { data } = await api.get("/notifications");
      setNotifications(data.notifications || []);
    } catch (error) {
      console.error("Fetch notifications error:", error);
    }
  };

  const handleSendNotification = async () => {
    if (!newMessage.trim()) return;
    setSendingNotif(true);
    try {
      await api.post("/notifications", { message: newMessage, type: newType });
      toast({ title: "Notification sent to all users!" });
      setNewMessage("");
      fetchNotifications();
    } catch {
      toast({ title: "Failed to send notification", variant: "destructive" });
    } finally {
      setSendingNotif(false);
    }
  };

  const handleDeleteNotification = async (id: string) => {
    try {
      await api.delete(`/notifications/${id}`);
      setNotifications((prev) => prev.filter((n) => n._id !== id));
      toast({ title: "Notification deleted" });
    } catch {
      toast({ title: "Failed to delete notification", variant: "destructive" });
    }
  };

  if (loading) return <div>Loading Admin Stats...</div>;

  return (
    <div className="container mx-auto p-6 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold tracking-tight">Admin Portal</h1>
          <p className="text-muted-foreground">Manage your exam platform metrics and tests.</p>
        </div>
        <Link to="/">
          <button className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted/40 hover:text-foreground transition-colors">
            <Home className="h-4 w-4" />
            Go to Home
          </button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="hover:shadow-lg transition-all border-l-4 border-l-blue-500">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Total Registered Users</CardTitle>
            <Users className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalUsers || 0}</div>
            <p className="text-xs text-muted-foreground">Across all platforms</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-all border-l-4 border-l-purple-500">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Active Tests</CardTitle>
            <FileText className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalTests || 0}</div>
            <p className="text-xs text-muted-foreground">Created & Published</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-all border-l-4 border-l-green-500">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Test Attempts</CardTitle>
            <Activity className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalAttempts || 0}</div>
            <p className="text-xs text-muted-foreground">Total student engagement</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

        {/* Quick Actions */}
        <Card className="p-4 flex flex-col gap-4">
          <h2 className="text-xl font-semibold">Quick Actions</h2>
          <div className="grid grid-cols-1 gap-3">
            <Link
              to="/admin/tests"
              className="flex items-center justify-between p-4 rounded-xl bg-secondary/30 hover:bg-secondary/50 transition-colors group"
            >
              <div className="flex flex-col">
                <span className="font-semibold text-foreground">Manage Tests</span>
                <span className="text-xs text-muted-foreground">Create, delete, and publish exams</span>
              </div>
              <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </Link>

            <Link
              to="/admin/monitoring"
              className="flex items-center justify-between p-4 rounded-xl bg-secondary/30 hover:bg-secondary/50 transition-colors group"
            >
              <div className="flex flex-col">
                <span className="font-semibold text-foreground">Live Monitoring</span>
                <span className="text-xs text-muted-foreground">View real-time student submissions</span>
              </div>
              <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </Link>

            <Link
              to="/admin/plans"
              className="flex items-center justify-between p-4 rounded-xl bg-primary/5 border border-primary/20 hover:bg-primary/10 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <Layers className="h-5 w-5 text-primary shrink-0" />
                <div className="flex flex-col">
                  <span className="font-semibold text-foreground">Manage Counselling Plans</span>
                  <span className="text-xs text-muted-foreground">Edit plans, pricing, features & details</span>
                </div>
              </div>
              <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform text-primary" />
            </Link>

            <Link
              to="/admin/users"
              className="flex items-center justify-between p-4 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40 hover:bg-amber-100 dark:hover:bg-amber-950/30 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <UserCog className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0" />
                <div className="flex flex-col">
                  <span className="font-semibold text-foreground">Manage Users</span>
                  <span className="text-xs text-muted-foreground">View all registered users, promote to admin</span>
                </div>
              </div>
              <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform text-amber-500" />
            </Link>

            <Link
              to="/admin/coupons"
              className="flex items-center justify-between p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40 hover:bg-emerald-100 dark:hover:bg-emerald-950/30 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <TicketPercent className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <div className="flex flex-col">
                  <span className="font-semibold text-foreground">Manage Coupons</span>
                  <span className="text-xs text-muted-foreground">Create offers, set limits, activate or disable campaigns</span>
                </div>
              </div>
              <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform text-emerald-500" />
            </Link>
          </div>
        </Card>

        {/* Notification Manager */}
        <Card className="p-4 flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-semibold">Send Notifications</h2>
          </div>

          {/* Compose */}
          <div className="space-y-3">
         <select
             value={newType}
             onChange={(e) => setNewType(e.target.value as "info" | "success" | "warning")}
             aria-label="Notification type"
             className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground"
            >
              <option value="info">ℹ️ Info</option>
              <option value="success">✅ Success</option>
              <option value="warning">⚠️ Warning</option>
            </select>
            <textarea
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type your notification message..."
              rows={3}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-1 focus:ring-ring"
            />
            <button
              onClick={handleSendNotification}
              disabled={!newMessage.trim() || sendingNotif}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              <Send className="h-4 w-4" />
              {sendingNotif ? "Sending..." : "Send to All Users"}
            </button>
          </div>

          {/* Active notifications list */}
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
              Active Notifications ({notifications.length})
            </p>
            {notifications.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">No notifications sent yet</p>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {notifications.map((n) => (
                  <div
                    key={n._id}
                    className="flex items-start justify-between gap-3 rounded-lg border border-border p-3"
                  >
                    <div className="flex items-start gap-2">
                      <span className="text-sm shrink-0">
                        {n.type === "success" ? "✅" : n.type === "warning" ? "⚠️" : "ℹ️"}
                      </span>
                      <div>
                        <p className="text-sm text-foreground">{n.message}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          {new Date(n.createdAt).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteNotification(n._id)}
                      className="shrink-0 p-1 rounded hover:bg-red-50 dark:hover:bg-red-950/20 text-red-500 transition-colors"
                      title="Delete notification"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>

      </div>
    </div>
  );
};

export default AdminDashboard;
