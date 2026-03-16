import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X, LogOut, User as UserIcon, Keyboard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { toast } from 'sonner';

const navItems = [
  { label: 'Home', path: '/' },
  { label: 'Exams', path: '/exams' },
  { label: 'Counselling', path: '/services' },
];

export default function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [user, setUser] = useState<{ name: string; email: string } | null>(null);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const storedUser = localStorage.getItem('mockprep_user');
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (error) {
        console.error('Error parsing user data:', error);
      }
    } else {
      setUser(null);
    }
  }, [location.pathname]);

  const handleLogout = () => {
    localStorage.removeItem('mockprep_user');
    setUser(null);
    toast.success('Logged out successfully');
    navigate('/');
  };

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-card/80 backdrop-blur-lg">
      <div className="container max-w-7xl mx-auto px-4 flex h-16 items-center justify-between">
        <Link to="/" className="flex items-center gap-2 shrink-0">
          <img
            src="/logo.png"
            alt="Vidyarthi Mitra"
            className="h-9 w-auto"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        </Link>

        {/* Desktop nav - Hidden on small screens */}
        <nav className="hidden md:flex items-center gap-1 mx-4">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`px-3 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
                location.pathname === item.path
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2 sm:gap-4">
          {/* Action buttons */}
          <div className="flex items-center gap-2">
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="h-auto py-1 px-2 flex items-center gap-2 rounded-full hover:bg-muted/80 transition-all group">
                    <div className="flex flex-col items-end justify-center leading-tight">
                      <span className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">
                        {user.name || 'User'}
                      </span>
                      <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                        Student
                      </span>
                    </div>
                    <Avatar className="h-8 w-8 border-none ring-0 overflow-hidden">
                      <AvatarFallback className="bg-primary/10 text-primary font-bold">
                        {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" sideOffset={8}>
                  <DropdownMenuLabel>
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-bold truncate">{user.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to="/exams" className="cursor-pointer flex items-center py-2">
                      <Keyboard className="mr-2 h-4 w-4" />
                      <span className="font-medium">My Exams</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-destructive font-bold cursor-pointer flex items-center py-2" onClick={handleLogout}>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Log out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <>
                <Link to="/login" className="hidden xs:block">
                  <Button variant="ghost" size="sm" className="font-bold px-3 sm:px-5">Login</Button>
                </Link>
                <Link to="/register">
                  <Button size="sm" className="font-bold px-3 sm:px-5 gradient-primary shadow-md">Register</Button>
                </Link>
              </>
            )}
          </div>

          {/* Mobile toggle - Only on mobile devices */}
          <button
            className="md:hidden p-2 rounded-lg hover:bg-muted transition-colors"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle Menu"
          >
            {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-border bg-card p-4 space-y-3 animate-in slide-in-from-top-4">
          <div className="space-y-1">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center px-4 py-3 rounded-xl text-base font-semibold ${
                  location.pathname === item.path ? 'bg-primary/10 text-primary' : 'text-muted-foreground'
                }`}
              >
                {item.label}
              </Link>
            ))}
          </div>
          
          <div className="pt-3 border-t border-border">
            {user ? (
              <div className="space-y-3">
                <div className="px-4 py-3 bg-muted/50 rounded-xl flex items-center justify-between gap-3">
                  <div className="text-right">
                    <p className="text-sm font-bold leading-none">{user.name}</p>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mt-1">Student</p>
                  </div>
                  <Avatar className="h-10 w-10 border border-border">
                    <AvatarFallback className="bg-primary/10 text-primary font-bold">
                      {user.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </div>
                <div className="grid grid-cols-1 gap-2">
                  <Link to="/exams" onClick={() => setMobileOpen(false)}>
                    <Button variant="outline" className="w-full justify-start py-6 font-semibold rounded-xl">
                      <Keyboard className="mr-2 h-5 w-5 opacity-70" /> My Exams
                    </Button>
                  </Link>
                  <Button variant="ghost" className="w-full justify-start py-6 text-destructive font-bold rounded-xl" onClick={handleLogout}>
                    <LogOut className="mr-2 h-5 w-5" /> Logout
                  </Button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <Link to="/login" onClick={() => setMobileOpen(false)} className="w-full">
                  <Button variant="outline" className="w-full py-6 font-bold rounded-xl text-lg">Login</Button>
                </Link>
                <Link to="/register" onClick={() => setMobileOpen(false)} className="w-full">
                  <Button className="w-full py-6 font-bold gradient-primary rounded-xl text-lg">Register</Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}

