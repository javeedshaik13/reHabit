import '@/index.css';
import React, { useState } from 'react';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Zap, Mail, Lock, User, Eye, EyeOff, CheckCircle2, Users, ShieldCheck } from 'lucide-react';
import { API } from '@/lib/config';

const ROLES = [
  {
    value: 'user',
    label: 'Regular User',
    desc: 'Build and track your habits',
    icon: User,
    color: 'emerald',
  },
  {
    value: 'mentor',
    label: 'Mentor / Coach',
    desc: 'Guide others in their journey',
    icon: Users,
    color: 'blue',
  },
  {
    value: 'admin',
    label: 'Admin',
    desc: 'Manage the platform',
    icon: ShieldCheck,
    color: 'violet',
  },
];

const colorMap = {
  emerald: {
    ring: 'ring-2 ring-emerald-400',
    bg: 'bg-emerald-50 border-emerald-400',
    icon: 'text-emerald-600 bg-emerald-100',
    label: 'text-emerald-700',
    desc: 'text-emerald-500',
    dot: 'bg-emerald-400',
  },
  blue: {
    ring: 'ring-2 ring-blue-400',
    bg: 'bg-blue-50 border-blue-400',
    icon: 'text-blue-600 bg-blue-100',
    label: 'text-blue-700',
    desc: 'text-blue-500',
    dot: 'bg-blue-400',
  },
  violet: {
    ring: 'ring-2 ring-violet-400',
    bg: 'bg-violet-50 border-violet-400',
    icon: 'text-violet-600 bg-violet-100',
    label: 'text-violet-700',
    desc: 'text-violet-500',
    dot: 'bg-violet-400',
  },
};

const AuthPage = ({ onLogin }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ email: '', password: '', name: '', role: 'user' });
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showSignupPassword, setShowSignupPassword] = useState(false);

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });
  const handleRoleChange = (value) => setFormData({ ...formData, role: value });
  const switchTab = (login) => {
    setIsLogin(login);
    setFormData({ email: '', password: '', name: '', role: 'user' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const endpoint = isLogin ? '/auth/login' : '/auth/register';
      const payload = isLogin
        ? { email: formData.email, password: formData.password }
        : { name: formData.name, email: formData.email, password: formData.password, role: formData.role };
      const response = await axios.post(`${API}${endpoint}`, payload);
      toast.success(isLogin ? 'Welcome back!' : 'Account created successfully!');
      onLogin(response.data.token, response.data.user);
    } catch (error) {
      const msg = error.response?.data?.message || error.response?.data?.error || error.message || 'Authentication failed';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const inputBase = "w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-800 placeholder:text-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent transition";

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-emerald-50 via-white to-teal-50">

      {/* ── Left branding panel (hidden on mobile) ── */}
      <div className="hidden lg:flex lg:w-5/12 xl:w-1/2 flex-col items-center justify-center p-12 bg-gradient-to-br from-emerald-500 to-teal-600 relative overflow-hidden">
        {/* decorative circles */}
        <div className="absolute -top-24 -left-24 w-80 h-80 bg-white/10 rounded-full" />
        <div className="absolute -bottom-32 -right-20 w-96 h-96 bg-white/10 rounded-full" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-white/5 rounded-full" />

        <div className="relative z-10 text-center text-white">
          <div className="w-20 h-20 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl">
            <Zap className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-5xl font-extrabold tracking-tight mb-3">reHabit</h1>
          <p className="text-emerald-100 text-xl font-medium mb-10">Reset · Restart · Rebuild</p>

          <div className="space-y-4 text-left max-w-xs mx-auto">
            {[
              'AI-powered habit coaching',
              'Streak tracking & XP system',
              'Community & mentor support',
              'Real-time progress analytics',
            ].map((f) => (
              <div key={f} className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-200 flex-shrink-0" />
                <span className="text-emerald-50 text-sm">{f}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Right form panel ── */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-10 overflow-y-auto">
        <div className="w-full max-w-md">

          {/* Mobile logo */}
          <div className="lg:hidden flex items-center justify-center gap-3 mb-8">
            <div className="w-10 h-10 bg-gradient-to-br from-emerald-400 to-teal-600 rounded-xl flex items-center justify-center shadow-md">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-extrabold text-slate-800">reHabit</span>
          </div>

          {/* Tab switcher */}
          <div className="flex bg-slate-100 rounded-2xl p-1.5 mb-8 shadow-inner">
            {['login', 'signup'].map((tab) => (
              <button
                key={tab}
                type="button"
                data-testid={`${tab}-tab`}
                onClick={() => switchTab(tab === 'login')}
                className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
                  (tab === 'login') === isLogin
                    ? 'bg-white text-emerald-700 shadow-md'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {tab === 'login' ? 'Login' : 'Sign Up'}
              </button>
            ))}
          </div>

          {/* ── LOGIN FORM ── */}
          {isLogin && (
            <div>
              <h2 className="text-2xl font-bold text-slate-800 mb-1">Welcome back 👋</h2>
              <p className="text-slate-500 text-sm mb-7">Sign in to continue your habit journey</p>

              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Email */}
                <div>
                  <Label htmlFor="login-email" className="text-sm font-medium text-slate-700 mb-1.5 block">Email address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      id="login-email"
                      name="email"
                      type="email"
                      placeholder="you@example.com"
                      className={inputBase}
                      value={formData.email}
                      onChange={handleChange}
                      required
                      autoComplete="username"
                      data-testid="login-email-input"
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <Label htmlFor="login-password" className="text-sm font-medium text-slate-700 mb-1.5 block">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      id="login-password"
                      name="password"
                      type={showLoginPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      className={`${inputBase} pr-10`}
                      value={formData.password}
                      onChange={handleChange}
                      required
                      autoComplete="current-password"
                      data-testid="login-password-input"
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition"
                      onClick={() => setShowLoginPassword((s) => !s)}
                      aria-label={showLoginPassword ? 'Hide password' : 'Show password'}
                    >
                      {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  data-testid="login-submit-btn"
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-semibold text-sm shadow-lg shadow-emerald-200 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed mt-2"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Signing in…
                    </span>
                  ) : 'Sign In'}
                </button>
              </form>

              <p className="text-center text-sm text-slate-500 mt-6">
                Don't have an account?{' '}
                <button type="button" onClick={() => switchTab(false)} className="text-emerald-600 font-semibold hover:underline">
                  Create one
                </button>
              </p>
            </div>
          )}

          {/* ── SIGNUP FORM ── */}
          {!isLogin && (
            <div>
              <h2 className="text-2xl font-bold text-slate-800 mb-1">Create your account ✨</h2>
              <p className="text-slate-500 text-sm mb-7">Start your habit-building journey today</p>

              <form onSubmit={handleSubmit} className="space-y-5">

                {/* Role selector */}
                <div>
                  <Label className="text-sm font-medium text-slate-700 mb-2 block">I want to join as</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {ROLES.map(({ value, label, desc, icon: Icon, color }) => {
                      const selected = formData.role === value;
                      const c = colorMap[color];
                      return (
                        <button
                          key={value}
                          type="button"
                          onClick={() => handleRoleChange(value)}
                          className={`relative flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 text-center transition-all duration-150 cursor-pointer ${
                            selected ? `${c.bg} ${c.ring}` : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                          }`}
                        >
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${selected ? c.icon : 'bg-slate-100 text-slate-500'}`}>
                            <Icon className="w-4 h-4" />
                          </div>
                          <span className={`text-xs font-semibold leading-tight ${selected ? c.label : 'text-slate-600'}`}>{label}</span>
                          <span className={`text-[10px] leading-tight hidden sm:block ${selected ? c.desc : 'text-slate-400'}`}>{desc}</span>
                          {selected && (
                            <span className={`absolute top-1.5 right-1.5 w-2 h-2 rounded-full ${c.dot}`} />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Full name */}
                <div>
                  <Label htmlFor="signup-name" className="text-sm font-medium text-slate-700 mb-1.5 block">Full name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      id="signup-name"
                      name="name"
                      type="text"
                      placeholder="John Doe"
                      className={inputBase}
                      value={formData.name}
                      onChange={handleChange}
                      required
                      autoComplete="name"
                      data-testid="signup-name-input"
                    />
                  </div>
                </div>

                {/* Email */}
                <div>
                  <Label htmlFor="signup-email" className="text-sm font-medium text-slate-700 mb-1.5 block">Email address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      id="signup-email"
                      name="email"
                      type="email"
                      placeholder="you@example.com"
                      className={inputBase}
                      value={formData.email}
                      onChange={handleChange}
                      required
                      autoComplete="off"
                      data-testid="signup-email-input"
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <Label htmlFor="signup-password" className="text-sm font-medium text-slate-700 mb-1.5 block">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      id="signup-password"
                      name="password"
                      type={showSignupPassword ? 'text' : 'password'}
                      placeholder="Min. 6 characters"
                      className={`${inputBase} pr-10`}
                      value={formData.password}
                      onChange={handleChange}
                      required
                      autoComplete="new-password"
                      data-testid="signup-password-input"
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition"
                      onClick={() => setShowSignupPassword((s) => !s)}
                      aria-label={showSignupPassword ? 'Hide password' : 'Show password'}
                    >
                      {showSignupPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  data-testid="signup-submit-btn"
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-semibold text-sm shadow-lg shadow-emerald-200 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed mt-2"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Creating account…
                    </span>
                  ) : 'Create Account'}
                </button>
              </form>

              <p className="text-center text-sm text-slate-500 mt-6">
                Already have an account?{' '}
                <button type="button" onClick={() => switchTab(true)} className="text-emerald-600 font-semibold hover:underline">
                  Sign in
                </button>
              </p>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default AuthPage;