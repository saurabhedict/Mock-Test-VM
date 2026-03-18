import { useState, useRef, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import Header from "@/components/Header";
import { useAuth } from "@/context/AuthContext";
import api from "@/services/api";

export default function VerifyOTPPage() {
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const inputs = useRef<(HTMLInputElement | null)[]>([]);
  const navigate = useNavigate();
  const location = useLocation();
  const { loginWithTokens } = useAuth();
  const email = (location.state as { email?: string })?.email;

  useEffect(() => { if (!email) navigate("/register"); }, [email, navigate]);
  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  const handleChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);
    if (value && index < 5) inputs.current[index + 1]?.focus();
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) inputs.current[index - 1]?.focus();
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pasted.length === 6) { setOtp(pasted.split("")); inputs.current[5]?.focus(); }
  };

  const handleVerify = async () => {
    const otpString = otp.join("");
    if (otpString.length !== 6) { toast.error("Please enter the complete 6-digit OTP"); return; }
    setLoading(true);
    try {
      const { data } = await api.post("/auth/verify-otp", { email, otp: otpString });
      await loginWithTokens(data.accessToken, data.user);
      toast.success(data.message);
      navigate("/");
    } catch (err: unknown) {
      toast.error((err as { response?: { data?: { message?: string } } })?.response?.data?.message || "Invalid OTP");
    } finally { setLoading(false); }
  };

  const handleResend = async () => {
    setResending(true);
    try {
      await api.post("/auth/resend-otp", { email });
      toast.success("New OTP sent to your email");
      setCountdown(60);
      setOtp(["", "", "", "", "", ""]);
      inputs.current[0]?.focus();
    } catch (err: unknown) {
      toast.error((err as { response?: { data?: { message?: string } } })?.response?.data?.message || "Failed to resend OTP");
    } finally { setResending(false); }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container flex items-center justify-center py-16">
        <div className="w-full max-w-md rounded-xl border border-border bg-card p-8 shadow-card text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
            <svg className="h-7 w-7 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <h1 className="text-2xl font-display font-bold text-foreground">Verify your email</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            We sent a 6-digit OTP to<br />
            <span className="font-medium text-foreground">{email}</span>
          </p>
          <div className="flex justify-center gap-3 mt-8" onPaste={handlePaste}>
            {otp.map((digit, i) => (
             <input
               key={i}
               ref={(el) => { inputs.current[i] = el; }}
               type="text"
               inputMode="numeric"
               maxLength={1}
               value={digit}
               aria-label={`OTP digit ${i + 1}`}
               onChange={(e) => handleChange(i, e.target.value)}
               onKeyDown={(e) => handleKeyDown(i, e)}
               className={`h-12 w-12 rounded-lg border-2 text-center text-xl font-bold bg-background text-foreground outline-none transition-colors ${digit ? "border-primary" : "border-border"} focus:border-primary`}
             />
            ))}
          </div>
          <Button className="w-full mt-6" onClick={handleVerify} disabled={loading || otp.join("").length !== 6}>
            {loading ? "Verifying..." : "Verify OTP"}
          </Button>
          <div className="mt-4 text-sm text-muted-foreground">
            Didn't receive it?{" "}
            {countdown > 0 ? <span>Resend in {countdown}s</span> : (
              <button onClick={handleResend} disabled={resending} className="text-primary hover:underline font-medium">
                {resending ? "Sending..." : "Resend OTP"}
              </button>
            )}
          </div>
          <p className="mt-4 text-xs text-muted-foreground">Check your spam folder if you don't see it.</p>
        </div>
      </div>
    </div>
  );
}