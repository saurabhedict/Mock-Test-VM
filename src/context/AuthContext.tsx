import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import api from "@/services/api";

interface Purchase {
  featureId: string;
  featureName: string;
  orderId: string;
  purchasedAt: string;
  validityMode?: "fixed_date" | "duration" | null;
  fixedExpiryDate?: string | null;
  validityValue?: number | null;
  validityUnit?: "months" | "years" | null;
  expiresAt?: string | null;
}
interface User {
  _id: string; name: string; email: string; phone?: string;
  examPref?: string; profilePhoto?: string; bio?: string;
  pincode?: string; city?: string; state?: string; country?: string;
  darkMode?: boolean; createdAt?: string;
  purchases?: Purchase[];
  role: 'student' | 'admin';
}
interface AuthContextType {
  user: User | null; loading: boolean;
  login: (email: string, password: string) => Promise<{ needsVerification?: boolean; email?: string }>;
  register: (data: RegisterData) => Promise<{ email: string }>;
  loginWithTokens: (accessToken: string, user: User) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}
interface RegisterData { name: string; email: string; password: string; phone?: string; examPref?: string; otpMethod?: string; }

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUser = async () => {
    const token = sessionStorage.getItem("accessToken");
    if (!token) { setLoading(false); return; }
    try { const { data } = await api.get("/auth/me"); setUser(data.user); }
    catch { sessionStorage.removeItem("accessToken"); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchUser(); }, []);

  const loginWithTokens = async (accessToken: string, userData: User) => {
    sessionStorage.setItem("accessToken", accessToken);
    setUser(userData);
  };

  const login = async (email: string, password: string) => {
    try {
      const { data } = await api.post("/auth/login", { email, password });
      sessionStorage.setItem("accessToken", data.accessToken);
      setUser(data.user);
      return {};
    } catch (err: unknown) {
      const response = (err as { response?: { data?: { needsVerification?: boolean; email?: string } } })?.response?.data;
      if (response?.needsVerification) return { needsVerification: true, email: response.email };
      throw err;
    }
  };

  const register = async (formData: RegisterData) => {
    const { data } = await api.post("/auth/register", formData);
    return { email: data.email };
  };

const logout = async () => {
  try { await api.post("/auth/logout"); } catch { }
  sessionStorage.removeItem("accessToken");
  // Clear all test results from localStorage on logout
  Object.keys(localStorage)
    .filter((k) => k.startsWith("result_") || k.startsWith("test_"))
    .forEach((k) => localStorage.removeItem(k));
  setUser(null);
};

  const refreshUser = async () => { await fetchUser(); };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, loginWithTokens, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
