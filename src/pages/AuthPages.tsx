import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Mail, Phone, User, Lock, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import Header from '@/components/Header';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('mockprep_user', JSON.stringify({ email, name: 'Student' }));
    toast.success('Logged in successfully!');
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container flex items-center justify-center py-16">
        <div className="w-full max-w-md rounded-xl border border-border bg-card p-8 shadow-card">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-display font-bold text-foreground">Welcome Back</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Login to continue your preparation
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="relative">
              <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Email"
                type="email"
                className="pl-10"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="relative">
              <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Password"
                type={showPassword ? 'text' : 'password'}
                className="pl-10 pr-10"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>

            <Button type="submit" className="w-full">
              Login
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-4">
            Don't have an account?{' '}
            <Link
              to="/register"
              className="text-primary hover:underline font-medium"
            >
              Register
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export function RegisterPage() {
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    examPref: '',
  });

  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();

    localStorage.setItem(
      'mockprep_user',
      JSON.stringify({ email: form.email, name: form.name })
    );

    toast.success('Account created successfully!');
    navigate('/');
  };

  const handleExamChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setForm({ ...form, examPref: e.target.value });
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <div className="container flex items-center justify-center py-16">
        <div className="w-full max-w-md rounded-xl border border-border bg-card p-8 shadow-card">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-display font-bold text-foreground">
              Create Account
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Start your exam preparation journey
            </p>
          </div>

          <form onSubmit={handleRegister} className="space-y-4">
            <div className="relative">
              <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Full Name"
                className="pl-10"
                value={form.name}
                onChange={(e) =>
                  setForm({ ...form, name: e.target.value })
                }
                required
              />
            </div>

            <div className="relative">
              <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Email"
                type="email"
                className="pl-10"
                value={form.email}
                onChange={(e) =>
                  setForm({ ...form, email: e.target.value })
                }
                required
              />
            </div>

            <div className="relative">
              <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Password"
                type={showPassword ? 'text' : 'password'}
                className="pl-10 pr-10"
                value={form.password}
                onChange={(e) =>
                  setForm({ ...form, password: e.target.value })
                }
                required
              />

              <button
                type="button"
                className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>

            <div className="relative">
              <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Phone Number"
                type="tel"
                className="pl-10"
                value={form.phone}
                onChange={(e) =>
                  setForm({ ...form, phone: e.target.value })
                }
                required
              />
            </div>

           <div className="relative">
              <label className="sr-only">Exam Preference</label>

                 <BookOpen className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />

               <select
                 aria-label="Exam Preference"
                 className="w-full rounded-lg border border-input bg-background pl-10 pr-4 py-2 text-sm text-foreground"
                 value={form.examPref}
                 onChange={handleExamChange}
                 required
               >
                 <option value="">Select Exam Preference</option>
                 <option value="mhtcet">MHT CET</option>
                 <option value="mah-bba-bca-cet">MAH-BBA/BCA CET</option>
                 <option value="jee">JEE Main</option>
                 <option value="neet">NEET</option>
               </select>
            </div>


            <Button type="submit" className="w-full">
              Create Account
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-4">
            Already have an account?{' '}
            <Link
              to="/login"
              className="text-primary hover:underline font-medium"
            >
              Login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}