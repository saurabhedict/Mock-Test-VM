import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Menu, X, User, ShoppingBag, LayoutGrid } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import QuickAccessSidebar from "@/components/QuickAccessSidebar";

const navItems = [
  { label: "Home", path: "/" },
  { label: "Exams", path: "/exams" },
  { label: "Counselling", path: "/services" },
];

export default function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    setProfileOpen(false);
    setMobileOpen(false);
    await logout();
    toast.success("Logged out successfully");
    navigate("/");
  };

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-border bg-card/80 backdrop-blur-lg">
        <div className="container flex h-16 items-center justify-between">

          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <img
              src="/logo.png"
              alt="Vidyarthi Mitra"
              className="h-9 w-auto"
              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
            />
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  location.pathname === item.path
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          {/* Desktop Right */}
          <div className="hidden md:flex items-center gap-2">
            {!user ? (
              <>
                <Link to="/login"><Button variant="ghost" size="sm">Login</Button></Link>
                <Link to="/register"><Button size="sm">Register</Button></Link>
              </>
            ) : (
              <div className="flex items-center gap-2">

                {/* My Purchases */}
                <Link to="/my-purchases">
                  <Button variant="ghost" size="sm" className="gap-1.5">
                    <ShoppingBag className="h-4 w-4" />
                    <span className="hidden lg:inline">My Purchases</span>
                  </Button>
                </Link>

                {/* Profile Dropdown */}
                <div className="relative">
                  <button
                    onClick={() => setProfileOpen(!profileOpen)}
                    className="p-2 rounded-full hover:bg-muted"
                    aria-label="Open profile menu"
                    title={user.name}
                  >
                    {user.profilePhoto ? (
                      <img src={user.profilePhoto} alt={user.name} className="h-7 w-7 rounded-full object-cover" />
                    ) : (
                      <User className="h-5 w-5" />
                    )}
                  </button>
                  {profileOpen && (
                    <div className="absolute right-0 mt-2 w-44 rounded-lg border border-border bg-card shadow-lg z-50">
                      <p className="px-4 py-2 text-sm font-semibold text-foreground border-b border-border truncate">
                        {user.name}
                      </p>
                      <Link
                        to="/profile"
                        onClick={() => setProfileOpen(false)}
                        className="block px-4 py-2 text-sm hover:bg-muted"
                      >
                        Profile
                      </Link>
                      <Link
                        to="/my-purchases"
                        onClick={() => setProfileOpen(false)}
                        className="block px-4 py-2 text-sm hover:bg-muted"
                      >
                        My Purchases
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Quick Access Sidebar Button */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 rounded-lg hover:bg-muted transition-colors"
              title="Quick Access"
              aria-label="Open quick access panel"
            >
              <LayoutGrid className="h-5 w-5 text-muted-foreground" />
            </button>
          </div>

          {/* Mobile Right */}
          <div className="flex md:hidden items-center gap-1">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 rounded-lg hover:bg-muted transition-colors"
              aria-label="Open quick access panel"
            >
              <LayoutGrid className="h-5 w-5 text-muted-foreground" />
            </button>
            <button
              className="p-2 rounded-lg hover:bg-muted"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label="Toggle mobile menu"
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileOpen && (
          <div className="md:hidden border-t border-border bg-card p-4 space-y-2">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setMobileOpen(false)}
                className="block px-4 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted"
              >
                {item.label}
              </Link>
            ))}
            {!user ? (
              <div className="flex gap-2 pt-2">
                <Link to="/login" className="flex-1">
                  <Button variant="outline" className="w-full" size="sm">Login</Button>
                </Link>
                <Link to="/register" className="flex-1">
                  <Button className="w-full" size="sm">Register</Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-2 pt-2">
                <Link
                  to="/profile"
                  onClick={() => setMobileOpen(false)}
                  className="block px-4 py-2 rounded-lg text-sm hover:bg-muted"
                >
                  Profile
                </Link>
                <Link
                  to="/my-purchases"
                  onClick={() => setMobileOpen(false)}
                  className="block px-4 py-2 rounded-lg text-sm hover:bg-muted"
                >
                  My Purchases
                </Link>
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-4 py-2 rounded-lg text-sm hover:bg-muted text-red-500"
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        )}
      </header>

      <QuickAccessSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
    </>
  );
}