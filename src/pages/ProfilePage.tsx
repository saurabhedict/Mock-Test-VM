import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { User, Mail, Phone, BookOpen, Calendar, LogOut, Pencil, Check, X, Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import Header from "@/components/Header";
import { useAuth } from "@/context/AuthContext";
import api from "@/services/api";

const examLabels: Record<string, string> = {
  mhtcet: "MHT CET",
  "mah-bba-bca-cet": "MAH-BBA/BCA CET",
  jee: "JEE Main",
  neet: "NEET",
};

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [profilePhoto, setProfilePhoto] = useState(user?.profilePhoto || "");
  const [form, setForm] = useState({
    name: user?.name || "",
    phone: user?.phone || "",
    examPref: user?.examPref || "",
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load latest photo from server on mount
  useEffect(() => {
    api.get("/auth/me").then(({ data }) => {
      if (data.user?.profilePhoto) setProfilePhoto(data.user.profilePhoto);
    }).catch(() => {});
  }, []);

  const handleLogout = async () => {
    await logout();
    toast.success("Logged out successfully");
    navigate("/");
  };

  const handleSave = async () => {
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
    setForm({ name: user?.name || "", phone: user?.phone || "", examPref: user?.examPref || "" });
    setEditing(false);
  };

  const handlePhotoClick = () => fileInputRef.current?.click();

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error("Image must be smaller than 2MB");
      return;
    }

    setUploadingPhoto(true);
    try {
      const formData = new FormData();
      formData.append("photo", file);

       const { data } = await api.post("/auth/upload-photo", formData, {
          headers: { "Content-Type": undefined },
         });
      setProfilePhoto(data.profilePhoto);
      toast.success("Profile photo updated!");
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || "Failed to upload photo";
      toast.error(msg);
      console.error("Upload error:", err);
    } finally {
      setUploadingPhoto(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container py-10 flex justify-center">
        <div className="w-full max-w-lg space-y-6">

          <div className="rounded-xl border border-border bg-card p-8 shadow-card">

            {/* Avatar with upload */}
            <div className="flex items-center gap-4 mb-6">
              <div className="relative">
                <div className="h-16 w-16 rounded-full overflow-hidden bg-primary/10 flex items-center justify-center">
                  {profilePhoto ? (
                    <img src={profilePhoto} alt={user.name} className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-2xl font-bold text-primary">
                      {user.name.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>

                <button
                  onClick={handlePhotoClick}
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

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  aria-label="Upload profile photo"
                  onChange={handlePhotoChange}
                />
              </div>

              <div>
                <h1 className="text-xl font-bold text-foreground">{user.name}</h1>
                <p className="text-sm text-muted-foreground">{user.email}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Click camera icon to change photo</p>
              </div>

              {!editing && (
                <Button variant="ghost" size="sm" className="ml-auto gap-1" onClick={() => setEditing(true)}>
                  <Pencil className="h-3.5 w-3.5" /> Edit
                </Button>
              )}
            </div>

            <div className="space-y-4">
              {/* Name */}
              <div className="flex items-start gap-3">
                <User className="h-4 w-4 text-muted-foreground mt-1 shrink-0" />
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground mb-1">Full Name</p>
                  {editing ? (
                    <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="h-8 text-sm" />
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
                  <p className="text-sm font-medium text-foreground">{user.email}</p>
                </div>
              </div>

              {/* Phone */}
              <div className="flex items-start gap-3">
                <Phone className="h-4 w-4 text-muted-foreground mt-1 shrink-0" />
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground mb-1">Phone Number</p>
                  {editing ? (
                    <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="h-8 text-sm" placeholder="Add phone number" />
                  ) : (
                    <p className="text-sm font-medium text-foreground">
                      {user.phone || <span className="text-muted-foreground italic">Not provided</span>}
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
                      {examLabels[user.examPref || ""] || <span className="text-muted-foreground italic">Not selected</span>}
                    </p>
                  )}
                </div>
              </div>

              {/* Member since */}
              <div className="flex items-start gap-3">
                <Calendar className="h-4 w-4 text-muted-foreground mt-1 shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Member Since</p>
                  <p className="text-sm font-medium text-foreground">
                    {new Date().toLocaleDateString("en-IN", { year: "numeric", month: "long" })}
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
            <p className="text-xs text-muted-foreground mb-4">Logging out will clear your session from this device.</p>
            <Button variant="outline" size="sm" className="gap-2 text-destructive border-destructive/30 hover:bg-destructive/10" onClick={handleLogout}>
              <LogOut className="h-3.5 w-3.5" /> Logout
            </Button>
          </div>

        </div>
      </div>
    </div>
  );
}