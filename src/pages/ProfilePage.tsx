import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { User, Mail, Phone, BookOpen, Calendar, LogOut, Pencil, Check, X, Camera, FileText, Eye, EyeOff} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import Header from "@/components/Header";
import { useAuth } from "@/context/AuthContext";
import api from "@/services/api";
import ImageCropModal from "@/components/ImageCropModal";
 
const examLabels: Record<string, string> = {
  mhtcet: "MHT CET",
  "mah-bba-bca-cet": "MAH-BBA/BCA CET",
  jee: "JEE Main",
  neet: "NEET",
};
 
export default function ProfilePage() {
  const { user, logout, refreshUser } = useAuth();
  const navigate = useNavigate();
 
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteInput, setDeleteInput] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [profilePhoto, setProfilePhoto] = useState(user?.profilePhoto || "");
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);
  const [photoMenuOpen, setPhotoMenuOpen] = useState(false);
  const [deleteStep, setDeleteStep] = useState<'password' | 'confirm'>('password');
  const [deletePassword, setDeletePassword] = useState("");
  const [showDeletePassword, setShowDeletePassword] = useState(false);
  const [verifyingPassword, setVerifyingPassword] = useState(false);
  const [forgotMode, setForgotMode] = useState(false);
  const [forgotOtpSent, setForgotOtpSent] = useState(false);
  const [forgotOtp, setForgotOtp] = useState("");
  const [forgotNewPassword, setForgotNewPassword] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [form, setForm] = useState({
    name: user?.name || "",
    phone: user?.phone || "",
    examPref: user?.examPref || "",
    bio: user?.bio || "",
  });
 
  const fileInputRef = useRef<HTMLInputElement>(null);
  const photoMenuRef = useRef<HTMLDivElement>(null);
 
  useEffect(() => {
    api.get("/auth/me").then(({ data }) => {
      if (data.user?.profilePhoto) setProfilePhoto(data.user.profilePhoto);
      if (data.user?.bio !== undefined) setForm((f) => ({ ...f, bio: data.user.bio }));
    }).catch(() => {});
  }, []);
 
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (photoMenuRef.current && !photoMenuRef.current.contains(e.target as Node)) {
        setPhotoMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);
 
  const handleLogout = async () => {
    await logout();
    toast.success("Logged out successfully");
    navigate("/");
  };
 
  const handleSave = async () => {
    if (form.bio.length > 200) { toast.error("Bio cannot exceed 200 characters"); return; }
    setSaving(true);
    try {
      await api.put("/auth/profile", form);
      toast.success("Profile updated successfully");
      setEditing(false);
      window.location.reload();
    } catch {
      toast.error("Failed to save changes");
    } finally {
      setSaving(false);
    }
  };
 
  const handleCancel = () => {
    setForm({
      name: user?.name || "",
      phone: user?.phone || "",
      examPref: user?.examPref || "",
      bio: user?.bio || "",
    });
    setEditing(false);
  };
 
  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Image must be smaller than 10MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setCropImageSrc(reader.result as string);
    };
    reader.readAsDataURL(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };
 
  const handleCropDone = async (croppedBlob: Blob) => {
    setCropImageSrc(null);
    setUploadingPhoto(true);
    try {
      const formData = new FormData();
      formData.append("photo", croppedBlob, "profile.jpg");
      const { data } = await api.post("/auth/upload-photo", formData, {
        headers: { "Content-Type": undefined },
      });
      setProfilePhoto(data.profilePhoto);
      await refreshUser();
      toast.success("Profile photo updated!");
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        "Failed to upload photo";
      toast.error(msg);
    } finally {
      setUploadingPhoto(false);
    }
  };
 
  const handleCropCancel = () => {
    setCropImageSrc(null);
  };
 
  const handleRemovePhoto = async () => {
    setPhotoMenuOpen(false);
    setUploadingPhoto(true);
    try {
      await api.put("/auth/profile", { profilePhoto: "" });
      setProfilePhoto("");
      await refreshUser();
      toast.success("Profile photo removed!");
    } catch {
      toast.error("Failed to remove photo");
    } finally {
      setUploadingPhoto(false);
    }
  };
 
  const handleDeleteAccount = async () => {
    if (deleteInput !== "DELETE") {
      toast.error('Please type DELETE to confirm');
      return;
    }
    setDeleting(true);
    try {
      await api.delete("/auth/delete-account");
      toast.success("Account deleted. Goodbye!");
      await logout();
      navigate("/");
    } catch {
      toast.error("Failed to delete account. Please try again.");
    } finally {
      setDeleting(false);
    }
  };
 
  const handleVerifyPassword = async () => {
    if (!deletePassword) { toast.error("Please enter your password"); return; }
    setVerifyingPassword(true);
    try {
      await api.post("/auth/verify-password-for-delete", { password: deletePassword });
      setDeleteStep('confirm');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || "Incorrect password";
      toast.error(msg);
    } finally {
      setVerifyingPassword(false);
    }
  };
 
  const handleForgotSendOTP = async () => {
    setForgotLoading(true);
    try {
      await api.post("/auth/forgot-password", { email: user!.email, otpMethod: "email" });
      setForgotOtpSent(true);
      toast.success("OTP sent to your email");
      setResendCooldown(30);
      const timer = setInterval(() => {
        setResendCooldown(prev => { if (prev <= 1) { clearInterval(timer); return 0; } return prev - 1; });
      }, 1000);
    } catch {
      toast.error("Failed to send OTP");
    } finally {
      setForgotLoading(false);
    }
  };
 
  const handleForgotReset = async () => {
    if (!forgotOtp || !forgotNewPassword) { toast.error("Please fill all fields"); return; }
    if (forgotNewPassword.length < 6) { toast.error("Password must be at least 6 characters"); return; }
    setForgotLoading(true);
    try {
      await api.post("/auth/reset-password", { email: user!.email, otp: forgotOtp, newPassword: forgotNewPassword });
      toast.success("Password reset! Now enter your new password below.");
      setForgotMode(false);
      setForgotOtpSent(false);
      setForgotOtp("");
      setForgotNewPassword("");
      setDeletePassword("");
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || "Failed to reset password";
      toast.error(msg);
    } finally {
      setForgotLoading(false);
    }
  };
 
  if (!user) return null;
 
  return (
    <div className="min-h-screen bg-background">
      <Header />
 
      {cropImageSrc && (
        <ImageCropModal
          imageSrc={cropImageSrc}
          onCropDone={handleCropDone}
          onCancel={handleCropCancel}
        />
      )}
 
      <div className="container py-10 flex justify-center">
        <div className="w-full max-w-lg space-y-6">
          <div className="rounded-xl border border-border bg-card p-6 sm:p-8 shadow-card">
 
            {/* Avatar row — FIXED for mobile */}
            <div className="flex items-start gap-4 mb-6 flex-wrap">
 
              {/* Photo with dropdown menu */}
              <div className="relative shrink-0" ref={photoMenuRef}>
                <div className="h-16 w-16 rounded-full overflow-hidden bg-primary/10 flex items-center justify-center">
                  {profilePhoto ? (
                    <img src={profilePhoto} alt={user.name} className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-2xl font-bold text-primary">
                      {user.name.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
 
                {/* Camera Button */}
                <button
                  type="button"
                  onClick={() => setPhotoMenuOpen(!photoMenuOpen)}
                  disabled={uploadingPhoto}
                  className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-primary flex items-center justify-center hover:bg-primary/90 transition-colors"
                  title="Change photo"
                >
                  {uploadingPhoto ? (
                    <div className="h-3 w-3 rounded-full border border-white border-t-transparent animate-spin" />
                  ) : (
                    <Camera className="h-3 w-3 text-white" />
                  )}
                </button>
 
                {/* Dropdown Menu */}
                {photoMenuOpen && (
                  <div className="absolute left-0 top-20 z-50 w-44 rounded-lg border border-border bg-card shadow-lg overflow-hidden">
                    <button
                      type="button"
                      onClick={() => {
                        setPhotoMenuOpen(false);
                        fileInputRef.current?.click();
                      }}
                      className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-foreground hover:bg-muted transition-colors"
                    >
                      <Camera className="h-4 w-4 text-primary" />
                      Upload Photo
                    </button>
                    {profilePhoto && (
                      <button
                        type="button"
                        onClick={handleRemovePhoto}
                        className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors border-t border-border"
                      >
                        <X className="h-4 w-4" />
                        Remove Photo
                      </button>
                    )}
                  </div>
                )}
 
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  aria-label="Upload profile photo"
                  onChange={handlePhotoChange}
                />
              </div>
 
              {/* Name & Email — takes remaining space */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h1 className="text-lg sm:text-xl font-bold text-foreground truncate">{user.name}</h1>
                    <p className="text-sm text-muted-foreground truncate">{user.email}</p>
                    {form.bio && !editing && (
                      <p className="text-xs text-muted-foreground mt-1 italic">"{form.bio}"</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Click camera icon to change photo
                    </p>
                  </div>
 
                  {/* Edit button — always stays inside card */}
                  {!editing && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-1 shrink-0"
                      onClick={() => setEditing(true)}
                    >
                      <Pencil className="h-3.5 w-3.5" /> Edit
                    </Button>
                  )}
                </div>
              </div>
            </div>
 
            <div className="space-y-4">
 
              {/* Bio */}
              <div className="flex items-start gap-3">
                <FileText className="h-4 w-4 text-muted-foreground mt-1 shrink-0" />
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground mb-1">Bio</p>
                  {editing ? (
                    <div>
                      <textarea
                        value={form.bio}
                        onChange={(e) => setForm({ ...form, bio: e.target.value })}
                        placeholder="Tell something about yourself... (max 200 characters)"
                        maxLength={200}
                        rows={3}
                        className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring resize-none"
                      />
                      <p className="text-xs text-muted-foreground text-right mt-0.5">
                        {form.bio.length}/200
                      </p>
                    </div>
                  ) : (
                    <p className="text-sm font-medium text-foreground">
                      {form.bio || (
                        <span className="text-muted-foreground italic">
                          No bio yet. Click Edit to add one.
                        </span>
                      )}
                    </p>
                  )}
                </div>
              </div>
 
              {/* Name */}
              <div className="flex items-start gap-3">
                <User className="h-4 w-4 text-muted-foreground mt-1 shrink-0" />
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground mb-1">Full Name</p>
                  {editing ? (
                    <Input
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      className="h-8 text-sm"
                    />
                  ) : (
                    <p className="text-sm font-medium text-foreground">{user.name}</p>
                  )}
                </div>
              </div>
 
              {/* Email */}
              <div className="flex items-start gap-3">
                <Mail className="h-4 w-4 text-muted-foreground mt-1 shrink-0" />
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground mb-1">Email Address</p>
                  <p className="text-sm font-medium text-foreground break-all">{user.email}</p>
                </div>
              </div>
 
              {/* Phone */}
              <div className="flex items-start gap-3">
                <Phone className="h-4 w-4 text-muted-foreground mt-1 shrink-0" />
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground mb-1">Phone Number</p>
                  {editing ? (
                    <Input
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      className="h-8 text-sm"
                      placeholder="Add phone number"
                    />
                  ) : (
                    <p className="text-sm font-medium text-foreground">
                      {user.phone || (
                        <span className="text-muted-foreground italic">Not provided</span>
                      )}
                    </p>
                  )}
                </div>
              </div>
 
              {/* Exam Preference */}
              <div className="flex items-start gap-3">
                <BookOpen className="h-4 w-4 text-muted-foreground mt-1 shrink-0" />
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground mb-1">Exam Preference</p>
                  {editing ? (
                    <select
                      aria-label="Exam Preference"
                      className="w-full rounded-lg border border-input bg-background px-3 py-1.5 text-sm text-foreground"
                      value={form.examPref}
                      onChange={(e) => setForm({ ...form, examPref: e.target.value })}
                    >
                      <option value="">Not selected</option>
                      <option value="mhtcet">MHT CET</option>
                      <option value="mah-bba-bca-cet">MAH-BBA/BCA CET</option>
                      <option value="jee">JEE Main</option>
                      <option value="neet">NEET</option>
                    </select>
                  ) : (
                    <p className="text-sm font-medium text-foreground">
                      {examLabels[user.examPref || ""] || (
                        <span className="text-muted-foreground italic">Not selected</span>
                      )}
                    </p>
                  )}
                </div>
              </div>
 
              {/* Member Since */}
              <div className="flex items-start gap-3">
                <Calendar className="h-4 w-4 text-muted-foreground mt-1 shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Member Since</p>
                  <p className="text-sm font-medium text-foreground">
                    {new Date().toLocaleDateString("en-IN", {
                      year: "numeric",
                      month: "long",
                    })}
                  </p>
                </div>
              </div>
            </div>
 
            {editing && (
              <div className="flex gap-2 mt-6 pt-4 border-t border-border">
                <Button size="sm" className="gap-1" onClick={handleSave} disabled={saving}>
                  <Check className="h-3.5 w-3.5" />
                  {saving ? "Saving..." : "Save Changes"}
                </Button>
                <Button size="sm" variant="outline" className="gap-1" onClick={handleCancel} disabled={saving}>
                  <X className="h-3.5 w-3.5" /> Cancel
                </Button>
              </div>
            )}
          </div>
 
          {/* Logout */}
          <div className="rounded-xl border border-destructive/20 bg-card p-6">
            <h2 className="text-sm font-semibold text-foreground mb-1">Session</h2>
            <p className="text-xs text-muted-foreground mb-4">
              Logging out will clear your session from this device.
            </p>
            <Button
              variant="outline"
              size="sm"
              className="gap-2 text-destructive border-destructive/30 hover:bg-destructive/10"
              onClick={handleLogout}
            >
              <LogOut className="h-3.5 w-3.5" /> Logout
            </Button>
          </div>
 
          {/* Danger Zone — Delete Account */}
          <div className="rounded-xl border border-red-300 dark:border-red-900 bg-card p-6">
            <h2 className="text-sm font-semibold text-red-600 dark:text-red-400 mb-1">Danger Zone</h2>
            <p className="text-xs text-muted-foreground mb-4">
              Permanently delete your account, all your test attempts, and purchase history. This cannot be undone.
            </p>
 
            {!showDeleteConfirm ? (
              <Button
                variant="outline"
                size="sm"
                className="gap-2 text-red-600 border-red-300 hover:bg-red-50 dark:border-red-900 dark:hover:bg-red-950/30"
                onClick={() => { setShowDeleteConfirm(true); setDeleteStep('password'); setForgotMode(false); }}
              >
                Delete Account
              </Button>
            ) : (
              <div className="space-y-4">
 
                {/* STEP 1 — Password verification */}
                {deleteStep === 'password' && !forgotMode && (
                  <div className="space-y-3">
                    <p className="text-xs font-medium text-red-600 dark:text-red-400">
                      Step 1 of 2 — Confirm your identity
                    </p>
                    <p className="text-xs text-muted-foreground">Enter your current password to proceed:</p>
                    <div className="relative">
                      <Input
                        type={showDeletePassword ? "text" : "password"}
                        value={deletePassword}
                        onChange={(e) => setDeletePassword(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleVerifyPassword()}
                        placeholder="Enter your password"
                        className="h-8 text-sm pr-9 border-red-300 dark:border-red-900"
                      />
                      <button
                        type="button"
                        onClick={() => setShowDeletePassword(!showDeletePassword)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showDeletePassword
                          ? <EyeOff className="h-3.5 w-3.5" />
                          : <Eye className="h-3.5 w-3.5" />
                        }
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => setForgotMode(true)}
                      className="text-xs text-blue-500 hover:underline"
                    >
                      Forgot password?
                    </button>
                    <div className="flex gap-2 flex-wrap">
                      <Button
                        size="sm"
                        disabled={!deletePassword || verifyingPassword}
                        className="bg-red-600 hover:bg-red-700 text-white"
                        onClick={handleVerifyPassword}
                      >
                        {verifyingPassword ? "Verifying..." : "Continue"}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => { setShowDeleteConfirm(false); setDeletePassword(""); setDeleteStep('password'); }}
                        disabled={verifyingPassword}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
 
                {/* FORGOT PASSWORD flow */}
                {deleteStep === 'password' && forgotMode && (
                  <div className="space-y-3">
                    <p className="text-xs font-medium text-blue-600 dark:text-blue-400">
                      Reset your password
                    </p>
 
                    {!forgotOtpSent ? (
                      <>
                        <p className="text-xs text-muted-foreground">
                          We'll send an OTP to <span className="font-medium break-all">{user?.email}</span>
                        </p>
                        <div className="flex gap-2 flex-wrap">
                          <Button size="sm" onClick={handleForgotSendOTP} disabled={forgotLoading}
                            className="bg-blue-600 hover:bg-blue-700 text-white">
                            {forgotLoading ? "Sending..." : "Send OTP to Email"}
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => setForgotMode(false)}>
                            Back
                          </Button>
                        </div>
                      </>
                    ) : (
                      <>
                        <p className="text-xs text-muted-foreground">
                          OTP sent to <span className="font-medium break-all">{user?.email}</span>. Enter it below with your new password.
                        </p>
                        <Input
                          value={forgotOtp}
                          onChange={(e) => setForgotOtp(e.target.value)}
                          placeholder="Enter OTP"
                          className="h-8 text-sm"
                          maxLength={6}
                        />
                        <Input
                          type="password"
                          value={forgotNewPassword}
                          onChange={(e) => setForgotNewPassword(e.target.value)}
                          placeholder="New password (min 6 characters)"
                          className="h-8 text-sm"
                        />
                        <div className="flex gap-2 flex-wrap">
                          <Button size="sm" onClick={handleForgotReset} disabled={forgotLoading}
                            className="bg-blue-600 hover:bg-blue-700 text-white">
                            {forgotLoading ? "Resetting..." : "Reset Password"}
                          </Button>
                          <Button size="sm" variant="outline" onClick={handleForgotSendOTP}
                            disabled={forgotLoading || resendCooldown > 0}>
                            {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend OTP"}
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => { setForgotMode(false); setForgotOtpSent(false); setForgotOtp(""); setForgotNewPassword(""); }}>
                            Back
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                )}
 
                {/* STEP 2 — Type DELETE to confirm */}
                {deleteStep === 'confirm' && (
                  <div className="space-y-3">
                    <p className="text-xs font-medium text-red-600 dark:text-red-400">
                      Step 2 of 2 — Final confirmation
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Type <span className="font-mono font-bold">DELETE</span> to permanently delete your account:
                    </p>
                    <Input
                      value={deleteInput}
                      onChange={(e) => setDeleteInput(e.target.value)}
                      placeholder="Type DELETE here"
                      className="h-8 text-sm border-red-300 dark:border-red-900 focus-visible:ring-red-400"
                    />
                    <div className="flex gap-2 flex-wrap">
                      <Button
                        size="sm"
                        disabled={deleteInput !== "DELETE" || deleting}
                        className="bg-red-600 hover:bg-red-700 text-white"
                        onClick={handleDeleteAccount}
                      >
                        {deleting ? "Deleting..." : "Confirm Delete"}
                      </Button>
                      <Button size="sm" variant="outline"
                        onClick={() => { setShowDeleteConfirm(false); setDeleteInput(""); setDeleteStep('password'); setDeletePassword(""); }}
                        disabled={deleting}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
 
              </div>
            )}
          </div>
 
        </div>
      </div>
    </div>
  );
}
 