import { useState } from "react";
import { Link, useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { Eye, EyeOff, Mail, User, Lock, BookOpen, Phone, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import Header from "@/components/Header";
import { useAuth } from "@/context/AuthContext";
import PhoneInput from "@/components/PhoneInput";
import { useExams } from "@/hooks/useExams";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { login } = useAuth();

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || "/";
  const sessionExpired = searchParams.get("reason") === "session_expired";

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const result = await login(email, password);
      if (result?.needsVerification) {
        toast.info("Please verify your email first");
        navigate("/verify-otp", { state: { email: result.email } });
        return;
      }
      toast.success("Logged in successfully!");
      navigate(from, { replace: true });
    } catch (err: unknown) {
      toast.error((err as { response?: { data?: { message?: string } } })?.response?.data?.message || "Login failed");
    } finally { setIsLoading(false); }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container flex items-center justify-center py-16">
        <div className="w-full max-w-md rounded-xl border border-border bg-card p-8 shadow-card">

          {/* Session expired banner */}
          {sessionExpired && (
            <div className="mb-5 flex items-start gap-3 rounded-lg border border-orange-200 bg-orange-50 px-4 py-3 dark:border-orange-800 dark:bg-orange-950/30">
              <AlertTriangle className="h-4 w-4 text-orange-500 shrink-0 mt-0.5" />
              <p className="text-sm text-orange-700 dark:text-orange-400">
                You were logged out because your account was signed in on another device.
              </p>
            </div>
          )}

          <div className="text-center mb-6">
            <h1 className="text-2xl font-display font-bold text-foreground">Welcome Back</h1>
            <p className="text-sm text-muted-foreground mt-1">Login to continue your preparation</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="relative">
              <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Email" type="email" className="pl-10" value={email}
                onChange={(e) => setEmail(e.target.value)} required disabled={isLoading} />
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Password" type={showPassword ? "text" : "password"}
                className="pl-10 pr-10" value={password}
                onChange={(e) => setPassword(e.target.value)} required disabled={isLoading} />
              <button type="button" className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
                onClick={() => setShowPassword(!showPassword)}>
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <div className="text-right">
              <Link to="/forgot-password" className="text-sm text-primary hover:underline">
                Forgot password?
              </Link>
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Logging in..." : "Login"}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-4">
            Don't have an account?{" "}
            <Link to="/register" className="text-primary hover:underline font-medium">Register</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export function RegisterPage() {
  const [form, setForm] = useState({ name: "", email: "", password: "", phone: "", examPref: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [otpMethod, setOtpMethod] = useState<"email" | "sms">("email");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { register } = useAuth();
  const { exams, loading: examsLoading } = useExams();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password.length < 6) { toast.error("Password must be at least 6 characters"); return; }
    if (otpMethod === "sms" && !form.phone) { toast.error("Phone number is required for SMS OTP"); return; }
    setIsLoading(true);
    try {
      const { email } = await register({ ...form, otpMethod });
      toast.success(otpMethod === "sms" ? "OTP sent to your phone!" : "OTP sent to your email!");
      navigate("/verify-otp", { state: { email, otpMethod } });
    } catch (err: unknown) {
      toast.error((err as { response?: { data?: { message?: string } } })?.response?.data?.message || "Registration failed");
    } finally { setIsLoading(false); }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container flex items-center justify-center py-16">
        <div className="w-full max-w-md rounded-xl border border-border bg-card p-8 shadow-card">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-display font-bold text-foreground">Create Account</h1>
            <p className="text-sm text-muted-foreground mt-1">Start your exam preparation journey</p>
          </div>
          <form onSubmit={handleRegister} className="space-y-4">
            <div className="relative">
              <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Full Name" className="pl-10" value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })} required disabled={isLoading} />
            </div>
            <div className="relative">
              <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Email" type="email" className="pl-10" value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })} required disabled={isLoading} />
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Password (min 6 characters)" type={showPassword ? "text" : "password"}
                className="pl-10 pr-10" value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })} required disabled={isLoading} />
              <button type="button" className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
                onClick={() => setShowPassword(!showPassword)}>
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>

            <PhoneInput
              value={form.phone}
              onChange={(fullNumber) => setForm({ ...form, phone: fullNumber })}
              placeholder={otpMethod === "sms" ? "Phone Number (required for SMS)" : "Phone Number (optional)"}
              required={otpMethod === "sms"}
              disabled={isLoading}
            />

            <div className="relative">
              <BookOpen className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <select
                aria-label="Exam Preference"
                className="w-full rounded-lg border border-input bg-background pl-10 pr-4 py-2 text-sm text-foreground"
                value={form.examPref}
                onChange={(e) => setForm({ ...form, examPref: e.target.value })}
                disabled={isLoading}
              >
                <option value="">Select Exam Preference</option>
                {examsLoading ? (
                  <option value="" disabled>Loading exams...</option>
                ) : (
                  exams.map((exam) => (
                    <option key={exam.examId} value={exam.examId}>
                      {exam.shortName || exam.examName}
                    </option>
                  ))
                )}
              </select>
            </div>

            <div>
              <p className="text-sm font-medium text-foreground mb-2">Receive OTP via</p>
              <div className="grid grid-cols-2 gap-3">
                <button type="button" onClick={() => setOtpMethod("email")}
                  className={`flex items-center justify-center gap-2 rounded-lg border-2 px-4 py-2.5 text-sm font-medium transition-colors
                    ${otpMethod === "email" ? "border-primary bg-primary/5 text-primary" : "border-border text-muted-foreground hover:border-primary/40"}`}>
                  <Mail className="h-4 w-4" /> Email
                </button>
                <button type="button" onClick={() => setOtpMethod("sms")}
                  className={`flex items-center justify-center gap-2 rounded-lg border-2 px-4 py-2.5 text-sm font-medium transition-colors
                    ${otpMethod === "sms" ? "border-primary bg-primary/5 text-primary" : "border-border text-muted-foreground hover:border-primary/40"}`}>
                  <Phone className="h-4 w-4" /> SMS
                </button>
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Sending OTP..." : "Create Account"}
            </Button>
          </form>
          <p className="text-center text-sm text-muted-foreground mt-4">
            Already have an account?{" "}
            <Link to="/login" className="text-primary hover:underline font-medium">Login</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
