import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Mail, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import Header from "@/components/Header";
import api from "@/services/api";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [otpMethod, setOtpMethod] = useState<"email" | "sms">("email");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post("/auth/forgot-password", { email, otpMethod });
      toast.success(data.message);
     navigate("/reset-password", { state: { email, otpMethod, maskedPhone: data.maskedPhone } });
    } catch (err: unknown) {
      toast.error(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        "Failed to send OTP"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container flex items-center justify-center py-16">
        <div className="w-full max-w-md rounded-xl border border-border bg-card p-8 shadow-card">
          <div className="text-center mb-6">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
              <svg className="h-7 w-7 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
              </svg>
            </div>
            <h1 className="text-2xl font-display font-bold text-foreground">Forgot Password</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Enter your email and we'll send you an OTP to reset your password
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Enter your registered email"
                type="email"
                className="pl-10"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
              />
            </div>

            <div>
              <p className="text-sm font-medium text-foreground mb-2">Receive OTP via</p>
              <div className="grid grid-cols-2 gap-3">
                <button type="button" onClick={() => setOtpMethod("email")}
                  className={`flex items-center justify-center gap-2 rounded-lg border-2 px-4 py-3 text-sm font-medium transition-colors
                    ${otpMethod === "email" ? "border-primary bg-primary/5 text-primary" : "border-border text-muted-foreground hover:border-primary/40"}`}>
                  <Mail className="h-4 w-4" /> Email
                </button>
                <button type="button" onClick={() => setOtpMethod("sms")}
                  className={`flex items-center justify-center gap-2 rounded-lg border-2 px-4 py-3 text-sm font-medium transition-colors
                    ${otpMethod === "sms" ? "border-primary bg-primary/5 text-primary" : "border-border text-muted-foreground hover:border-primary/40"}`}>
                  <Phone className="h-4 w-4" /> SMS
                </button>
              </div>
              {otpMethod === "sms" && (
                <p className="mt-2 text-xs text-muted-foreground">
                  OTP will be sent to the phone number registered with this account.
                </p>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Sending OTP..." : "Send OTP"}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-4">
            Remember your password?{" "}
            <Link to="/login" className="text-primary hover:underline font-medium">Login</Link>
          </p>
        </div>
      </div>
    </div>
  );
}