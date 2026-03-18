import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  X, Flame, Target, Clock, BookOpen, BarChart3, Bell,
  Moon, Sun, Zap, Trophy, Share2, MessageCircle, Flag,
  ShoppingBag, ChevronRight, Calendar, Play, TrendingUp,
  CheckCircle2, AlertCircle, Info
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

const QUOTES = [
  "Success is the sum of small efforts, repeated day in and day out.",
  "The expert in anything was once a beginner.",
  "Don't watch the clock; do what it does. Keep going.",
  "Believe you can and you're halfway there.",
  "Hard work beats talent when talent doesn't work hard.",
  "The more that you read, the more things you will know.",
  "Push yourself, because no one else is going to do it for you.",
  "Dream big. Work hard. Stay focused.",
];

const EXAM_DATES: Record<string, string> = {
  mhtcet: "2025-05-11",
  "mah-bba-bca-cet": "2025-03-15",
  jee: "2025-04-02",
  neet: "2025-05-04",
};

const EXAM_LABELS: Record<string, string> = {
  mhtcet: "MHT CET",
  "mah-bba-bca-cet": "MAH BBA/BCA CET",
  jee: "JEE Main",
  neet: "NEET",
};

interface Notification {
  id: string;
  type: "success" | "info" | "warning";
  message: string;
  time: string;
  read: boolean;
}

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function QuickAccessSidebar({ open, onClose }: Props) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const sidebarRef = useRef<HTMLDivElement>(null);

  const [darkMode, setDarkMode] = useState(
    () => document.documentElement.classList.contains("dark")
  );
  const [studyTime, setStudyTime] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerInterval, setTimerInterval] = useState<ReturnType<typeof setInterval> | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([
    { id: "1", type: "success", message: "New MHT CET mock test added!", time: "2 hrs ago", read: false },
    { id: "2", type: "info", message: "Your profile is 70% complete", time: "1 day ago", read: false },
    { id: "3", type: "warning", message: "MHT CET exam in 45 days!", time: "Just now", read: false },
  ]);
  const [activeTab, setActiveTab] = useState<"main" | "notifications">("main");
  const [streak] = useState(user?.streak || 0);
  const [quote] = useState(() => QUOTES[Math.floor(Math.random() * QUOTES.length)]);

  const examKey = user?.examPref || "";
  const examDateStr = EXAM_DATES[examKey];
  const examLabel = EXAM_LABELS[examKey] || "Your Exam";
  const daysLeft = examDateStr
    ? Math.max(0, Math.ceil((new Date(examDateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : null;

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (sidebarRef.current && !sidebarRef.current.contains(e.target as Node)) onClose();
    };
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open, onClose]);

  useEffect(() => {
    const root = window.document.documentElement;
    if (darkMode) {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    localStorage.setItem("darkMode", String(darkMode));
  }, [darkMode]);

  useEffect(() => {
    return () => {
      if (timerInterval) clearInterval(timerInterval);
    };
  }, [timerInterval]);

  const toggleTimer = () => {
    if (timerRunning) {
      if (timerInterval) clearInterval(timerInterval);
      setTimerInterval(null);
      setTimerRunning(false);
      toast.success(`Study session: ${formatTime(studyTime)} recorded!`);
    } else {
      const interval = setInterval(() => setStudyTime((t) => t + 1), 1000);
      setTimerInterval(interval);
      setTimerRunning(true);
    }
  };

  const formatTime = (secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    return h > 0
      ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
      : `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  const unreadCount = notifications.filter((n) => !n.read).length;
  const markAllRead = () => setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: "Vidyarthi Mitra",
        text: "Join me on Vidyarthi Mitra!",
        url: window.location.origin,
      });
    } else {
      navigator.clipboard.writeText(window.location.origin);
      toast.success("Link copied to clipboard!");
    }
  };

  const handleLogout = async () => {
    await logout();
    onClose();
    navigate("/");
    toast.success("Logged out successfully");
  };

  const purchaseCount =
    (user as unknown as { purchases?: unknown[] })?.purchases?.length || 0;

  const testResults = Object.keys(localStorage)
    .filter((k) => k.startsWith("result_"))
    .map((k) => {
      try { return JSON.parse(localStorage.getItem(k) || ""); }
      catch { return null; }
    })
    .filter(Boolean);

  const totalTests = testResults.length;
  const avgAccuracy =
    totalTests > 0
      ? Math.round(
          testResults.reduce((acc, r) => {
            const correct = Object.entries(r.answers).filter(
              ([i, a]) => r.questions[parseInt(i)]?.correctAnswer === a
            ).length;
            return acc + (correct / (r.questions?.length || 1)) * 100;
          }, 0) / totalTests
        )
      : 0;

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" />
      <div
        ref={sidebarRef}
        className="fixed top-0 right-0 z-50 h-full w-80 bg-card border-l border-border shadow-2xl flex flex-col overflow-hidden"
        style={{ animation: "slideInRight 0.25s ease-out" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card shrink-0">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center">
              <Zap className="h-3.5 w-3.5 text-primary" />
            </div>
            <span className="font-semibold text-sm text-foreground">Quick Access</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              aria-label="Toggle notifications"
              onClick={() => setActiveTab(activeTab === "notifications" ? "main" : "notifications")}
              className="relative p-1.5 rounded-lg hover:bg-muted transition-colors"
            >
              <Bell className="h-4 w-4 text-muted-foreground" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center font-bold">
                  {unreadCount}
                </span>
              )}
            </button>
            <button
              type="button"
              aria-label="Close sidebar"
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-muted transition-colors"
            >
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">

          {/* Notifications Tab */}
          {activeTab === "notifications" && (
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-foreground">Notifications</h3>
                <button
                  type="button"
                  onClick={markAllRead}
                  aria-label="Mark all notifications as read"
                  className="text-xs text-primary hover:underline"
                >
                  Mark all read
                </button>
              </div>
              <div className="space-y-2">
                {notifications.map((n) => (
                  <div
                    key={n.id}
                    className={`rounded-lg p-3 flex gap-2.5 ${n.read ? "bg-muted/40" : "bg-accent"}`}
                  >
                    {n.type === "success" && <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />}
                    {n.type === "info" && <Info className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />}
                    {n.type === "warning" && <AlertCircle className="h-4 w-4 text-orange-500 shrink-0 mt-0.5" />}
                    <div>
                      <p className="text-xs text-foreground">{n.message}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{n.time}</p>
                    </div>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setActiveTab("main")}
                aria-label="Back to main panel"
                className="mt-4 text-xs text-primary hover:underline"
              >
                ← Back
              </button>
            </div>
          )}

          {/* Main Tab */}
          {activeTab === "main" && (
            <div className="p-4 space-y-4">

                    {/* User info */}
                    {user && (
                      <div className="flex items-center gap-3 pb-3 border-b border-border">
                        <div className="h-10 w-10 rounded-full overflow-hidden bg-primary/10 flex items-center justify-center shrink-0">
                          {user.profilePhoto ? (
                            <img src={user.profilePhoto} alt={user.name} className="h-full w-full object-cover" />
                          ) : (
                            <span className="font-bold text-primary">{user.name.charAt(0).toUpperCase()}</span>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-sm text-foreground truncate">{user.name}</p>
                          <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                        </div>
                      </div>
                    )}

              {/* 1. Study Streak */}
              <div className="rounded-lg bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800 p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Flame className="h-4 w-4 text-orange-500" />
                    <span className="text-sm font-medium text-foreground">Study Streak</span>
                  </div>
                  <span className="text-lg font-bold text-orange-500">{streak} 🔥</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {streak === 0
                    ? "Start studying to build your streak!"
                    : `${streak} day${streak > 1 ? "s" : ""} in a row!`}
                </p>
              </div>


              {/* 4. Quick Stats */}
              <div className="rounded-lg border border-border p-3">
                <div className="flex items-center gap-2 mb-3">
                  <BarChart3 className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium text-foreground">Your Performance</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="text-center p-2 bg-muted/50 rounded-lg">
                    <p className="text-lg font-bold text-foreground">{totalTests}</p>
                    <p className="text-[10px] text-muted-foreground">Tests</p>
                  </div>
                  <div className="text-center p-2 bg-muted/50 rounded-lg">
                    <p className="text-lg font-bold text-foreground">{avgAccuracy}%</p>
                    <p className="text-[10px] text-muted-foreground">Accuracy</p>
                  </div>
                  <div className="text-center p-2 bg-muted/50 rounded-lg">
                    <p className="text-lg font-bold text-foreground">{purchaseCount}</p>
                    <p className="text-[10px] text-muted-foreground">Purchased</p>
                  </div>
                </div>
              </div>

              {/* 5. Quick Start */}
              <div className="rounded-lg border border-border p-3">
                <div className="flex items-center gap-2 mb-2">
                  <Play className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium text-foreground">Quick Start</span>
                </div>
                <Link
                  to="/exams"
                  onClick={onClose}
                  className="flex items-center justify-between w-full py-2 px-3 bg-primary text-primary-foreground rounded-lg text-xs font-medium hover:bg-primary/90 transition-colors"
                >
                  Start a Mock Test <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              </div>

              {/* 6. My Progress */}
              <div className="rounded-lg border border-border p-3">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium text-foreground">My Progress</span>
                </div>
                <div className="space-y-1">
                  {[
                    { label: "View All Results", path: "/exams", icon: BarChart3 },
                    { label: "My Purchases", path: "/my-purchases", icon: ShoppingBag },
                    { label: "My Profile", path: "/profile", icon: Target },
                  ].map((item) => (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={onClose}
                      className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-muted text-xs text-foreground transition-colors"
                    >
                      <span className="flex items-center gap-2">
                        <item.icon className="h-3.5 w-3.5 text-muted-foreground" />
                        {item.label}
                      </span>
                      <ChevronRight className="h-3 w-3 text-muted-foreground" />
                    </Link>
                  ))}
                </div>
              </div>

             

              {/* 9. Quote of the Day */}
              <div className="rounded-lg bg-primary/5 border border-primary/20 p-3">
                <div className="flex items-center gap-2 mb-1.5">
                  <BookOpen className="h-4 w-4 text-primary" />
                  <span className="text-xs font-medium text-primary">Quote of the Day</span>
                </div>
                <p className="text-xs text-foreground italic leading-relaxed">"{quote}"</p>
              </div>

              {/* 10. Dark Mode */}
              <div className="rounded-lg border border-border p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {darkMode
                      ? <Moon className="h-4 w-4 text-primary" />
                      : <Sun className="h-4 w-4 text-yellow-500" />
                    }
                    <span className="text-sm font-medium text-foreground">
                      {darkMode ? "Dark Mode" : "Light Mode"}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setDarkMode((prev) => !prev)}
                    aria-label={darkMode ? "Switch to light mode" : "Switch to dark mode"}
                    className={`relative inline-flex w-11 h-6 rounded-full transition-colors duration-200 shrink-0 ${
                      darkMode ? "bg-primary" : "bg-muted border border-border"
                    }`}
                  >
                    <span
                      className={`inline-block mt-0.5 ml-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${
                        darkMode ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* 11. Refer a Friend */}
              <div className="rounded-lg border border-border p-3">
                <div className="flex items-center gap-2 mb-2">
                  <Share2 className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium text-foreground">Refer a Friend</span>
                </div>
                <p className="text-xs text-muted-foreground mb-2">
                  Share Vidyarthi Mitra with your friends!
                </p>
                <button
                  type="button"
                  onClick={handleShare}
                  aria-label="Share Vidyarthi Mitra link"
                  className="w-full py-1.5 rounded-lg text-xs font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                >
                  Share Link
                </button>
              </div>

              {/* 12. Help & Support */}
              <div className="rounded-lg border border-border p-3">
                <div className="flex items-center gap-2 mb-3">
                  <MessageCircle className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium text-foreground">Help &amp; Support</span>
                </div>
                <div className="space-y-2">

                  {/* Email */}
             <button
                     type="button"
                  onClick={() => {
                         window.open(
                              "https://mail.google.com/mail/?view=cm&to=contact@vidyarthimitra.org&su=Support Request",
                              "_blank"
                             );
                           }}
                     className="flex items-center gap-3 py-2 px-3 rounded-lg border border-border hover:bg-muted transition-colors w-full                    text-left"
                   >
                     <div className="h-7 w-7 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                       <MessageCircle className="h-3.5 w-3.5 text-red-500" />
                     </div>
                     <div className="min-w-0">
                       <p className="text-xs font-medium text-foreground">Email Us</p>
                       <p className="text-[10px] text-muted-foreground truncate">contact@vidyarthimitra.org</p>
                     </div>
                     <ChevronRight className="h-3.5 w-3.5 text-muted-foreground ml-auto shrink-0" />
            </button>


                  {/* WhatsApp */}
                  <button
                    type="button"
                    onClick={() => { window.open("https://wa.me/917720081400?text=Hi%20Vidyarthi%20Mitra%2C%20I%20need%20support", "_blank"); }}
                    className="flex items-center gap-3 py-2 px-3 rounded-lg border border-border hover:bg-muted transition-colors w-full text-left"
                  >
                    <div className="h-7 w-7 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                      <MessageCircle className="h-3.5 w-3.5 text-green-500" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-foreground">WhatsApp Us</p>
                      <p className="text-[10px] text-muted-foreground">+91 77200 81400</p>
                    </div>
                    <ChevronRight className="h-3.5 w-3.5 text-muted-foreground ml-auto shrink-0" />
                  </button>

                  {/* Report Issue */}
                  <button
                          type="button"
                      onClick={() => {
                        window.open(
                          "https://mail.google.com/mail/?view=cm&to=contact@vidyarthimitra.org&su=Issue%20Report%20-%20Vidyarthi%20Mitra&                    body=Hi%20Vidyarthi%20Mitra%20Team%2C%0A%0AI%20would%20like%20to%20report%20the%20following%20issue%3A%0A%0A%5BDe                    scribe%20your%20issue%20here%5D%0A%0ADevice%3A%20%5BYour%20device%5D%0ABrowser%3A%20%5BYour%20browser%5D%0A%0ATha                    nk%20you",
                          "_blank"
                        );
                      }}
                      className="flex items-center gap-3 py-2 px-3 rounded-lg border border-border hover:bg-muted transition-colors w-full                     text-left"
                    >
                      <div className="h-7 w-7 rounded-full bg-orange-100 flex items-center justify-center shrink-0">
                        <Flag className="h-3.5 w-3.5 text-orange-500" />
                      </div>
                      <div>
                        <p className="text-xs font-medium text-foreground">Report an Issue</p>
                        <p className="text-[10px] text-muted-foreground">Help us improve</p>
                      </div>
                      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground ml-auto shrink-0" />
                    </button>

                </div>
              </div>

              {/* 13. Premium Services */}
              <div className="rounded-lg border border-border p-3">
                <div className="flex items-center gap-2 mb-2">
                  <ShoppingBag className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium text-foreground">Premium Services</span>
                </div>
                <Link
                  to="/services"
                  onClick={onClose}
                  className="flex items-center justify-between w-full py-1.5 px-2 bg-muted rounded-lg text-xs font-medium text-foreground hover:bg-muted/70 transition-colors"
                >
                  View All Services <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              </div>

              {/* Logout */}
              {user && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full text-red-500 border-red-200 hover:bg-red-50"
                  onClick={handleLogout}
                >
                  Logout
                </Button>
              )}

              <div className="h-4" />
            </div>
          )}
        </div>
      </div>
    </>
  );
}