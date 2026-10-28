import React, { useState, useEffect, useMemo } from 'react';
import { useStore } from '../context/StoreContext';
import { apiFetch } from '../config/api';
import { ModuleKey } from '../types';
import {
  Store,
  Mail,
  Phone,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  HelpCircle,
  X,
  KeyRound,
  RotateCw,
  Sparkles,
  UserCheck,
  Building2,
  Clock,
} from 'lucide-react';
import loginHeroImage from '../assets/images/pos_login_hero_1792164837044.jpg';

interface POSLoginPageProps {
  onLoginSuccess?: (redirectModule: ModuleKey) => void;
  onBackToWebsite?: () => void;
}

export const POSLoginPage: React.FC<POSLoginPageProps> = ({ onLoginSuccess, onBackToWebsite }) => {
  const { login, rememberedIdentifier, setRememberedIdentifier, setActiveModule, notify } = useStore();

  const [identifier, setIdentifier] = useState(rememberedIdentifier || '');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(Boolean(rememberedIdentifier));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Rate Limiting lockout state
  const [lockoutSeconds, setLockoutSeconds] = useState<number>(0);

  // Forgot Password Modal State
  const [forgotModalOpen, setForgotModalOpen] = useState(false);
  const [forgotIdentifier, setForgotIdentifier] = useState('');
  const [forgotStep, setForgotStep] = useState<'request' | 'verify'>('request');
  const [forgotCode, setForgotCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState<string | null>(null);
  const [forgotSuccess, setForgotSuccess] = useState<string | null>(null);
  const [simulatedCodeReceived, setSimulatedCodeReceived] = useState<string | null>(null);

  // Contact Support Modal State
  const [supportModalOpen, setSupportModalOpen] = useState(false);

  // Sync remembered identifier when prop updates
  useEffect(() => {
    if (rememberedIdentifier && !identifier) {
      setIdentifier(rememberedIdentifier);
      setRememberMe(true);
    }
  }, [rememberedIdentifier]);

  // Lockout countdown timer
  useEffect(() => {
    if (lockoutSeconds <= 0) return;
    const timer = setInterval(() => {
      setLockoutSeconds((prev) => {
        if (prev <= 1) {
          setError(null);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [lockoutSeconds]);

  // Automatic Identifier Type Detection (Email vs Rwanda Phone)
  const identifierType = useMemo<'email' | 'phone' | 'empty'>(() => {
    const trimmed = identifier.trim();
    if (!trimmed) return 'empty';
    if (trimmed.includes('@')) return 'email';
    if (/^[0-9+() -]+$/.test(trimmed)) return 'phone';
    return 'email'; // fallback
  }, [identifier]);

  // Form Submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (lockoutSeconds > 0) return;

    setError(null);

    // 1. Validation
    if (!identifier.trim()) {
      setError('Please enter your registered phone number or email address.');
      return;
    }

    if (!password) {
      setError('Please enter your account password.');
      return;
    }

    setLoading(true);

    try {
      const result = await login(identifier.trim(), password, rememberMe);

      if (!result.success) {
        setError(result.error || 'Authentication failed. Please verify your credentials.');

        // Extract retry-after if rate limited
        if (result.error && result.error.includes('seconds before trying again')) {
          const match = result.error.match(/(\d+)\s*seconds/);
          if (match && match[1]) {
            setLockoutSeconds(parseInt(match[1], 10));
          }
        }
        setLoading(false);
        return;
      }

      // Success: redirect user to their authorized module
      if (result.redirectModule) {
        setActiveModule(result.redirectModule);
        if (onLoginSuccess) {
          onLoginSuccess(result.redirectModule);
        }
      }
    } catch {
      setError('A connection error occurred. Please check your network and try again.');
    } finally {
      setLoading(false);
    }
  };

  // Forgot Password: Request Code
  const handleRequestResetCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError(null);
    setForgotSuccess(null);
    setSimulatedCodeReceived(null);

    if (!forgotIdentifier.trim()) {
      setForgotError('Please enter your registered email address or phone number.');
      return;
    }

    setForgotLoading(true);
    try {
      const res = await apiFetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: forgotIdentifier.trim() }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.success) {
        setForgotError(data.error || 'Unable to request password reset code. Please try again.');
        setForgotLoading(false);
        return;
      }

      setForgotSuccess(data.message);
      if (data.simulatedCode) {
        setSimulatedCodeReceived(data.simulatedCode);
        setForgotCode(data.simulatedCode);
      }
      setForgotStep('verify');
    } catch {
      setForgotError('Connection error to authentication backend. Please check network.');
    } finally {
      setForgotLoading(false);
    }
  };

  // Forgot Password: Verify & Reset
  const handleCompleteReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError(null);

    if (!forgotCode.trim()) {
      setForgotError('Please enter the 6-digit verification code.');
      return;
    }

    if (newPassword.length < 6) {
      setForgotError('New password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setForgotError('Passwords do not match. Please re-enter.');
      return;
    }

    setForgotLoading(true);
    try {
      const res = await apiFetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: forgotIdentifier.trim(),
          code: forgotCode.trim(),
          newPassword,
        }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.success) {
        setForgotError(data.error || 'Password reset failed. Code may have expired.');
        setForgotLoading(false);
        return;
      }

      notify('success', 'Password Updated', 'Your password has been changed. You can now log in.');
      setForgotModalOpen(false);
      setIdentifier(forgotIdentifier.trim());
      setPassword(newPassword);
      setForgotStep('request');
      setForgotCode('');
      setNewPassword('');
      setConfirmPassword('');
    } catch {
      setForgotError('Failed to complete password reset due to backend connection error.');
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between font-sans text-slate-900 selection:bg-emerald-100 selection:text-emerald-900">
      {/* Main Container */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-10">
        <div className="w-full max-w-5xl bg-white rounded-3xl border border-slate-200/90 shadow-xl overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-[640px]">
          {/* Left Column: Brand Hero Imagery & Retail Presence (Desktop only) */}
          <div className="hidden lg:flex lg:col-span-5 bg-gradient-to-br from-[#0c4a26] to-[#08331a] relative flex-col justify-between p-8 text-white overflow-hidden">
            {/* Background image overlay */}
            <div className="absolute inset-0 opacity-25 mix-blend-overlay pointer-events-none">
              <img
                src={loginHeroImage}
                alt="Fresh & More Grocery Store Counter"
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="absolute inset-0 bg-gradient-to-t from-[#08331a] via-[#0c4a26]/85 to-transparent pointer-events-none" />

            {/* Top brand mark */}
            <div className="relative z-10">
              <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-emerald-300 shadow-sm mb-4">
                <Store className="w-6 h-6" />
              </div>
              <h2 className="text-2xl font-bold tracking-tight text-white">Fresh & More</h2>
              <p className="text-emerald-200/80 text-xs mt-0.5">High-Speed Handheld M-POS</p>
            </div>

            {/* Middle Feature Highlights */}
            <div className="relative z-10 space-y-4 my-auto">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-300 shrink-0 mt-0.5">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-white">Role-Based Access Control</h4>
                  <p className="text-xs text-emerald-200/70 mt-0.5 leading-relaxed">
                    Dedicated registers for Cashiers, Inventory managers, Owners and Super Admins.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-300 shrink-0 mt-0.5">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-white">Precision Time Sync</h4>
                  <p className="text-xs text-emerald-200/70 mt-0.5 leading-relaxed">
                    Automatic network calibration for tamper-proof shift records & receipts.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-300 shrink-0 mt-0.5">
                  <Building2 className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-white">Multi-Branch Architecture</h4>
                  <p className="text-xs text-emerald-200/70 mt-0.5 leading-relaxed">
                    Kigali Main Store, Kimironko, Nyarutarama and Kicukiro branches.
                  </p>
                </div>
              </div>
            </div>

            {/* Bottom info */}
            <div className="relative z-10 text-[11px] text-emerald-200/60 pt-4 border-t border-white/10 flex items-center justify-between">
              <span>Retail Version 2.4.0</span>
              <span>Kigali, Rwanda</span>
            </div>
          </div>

          {/* Right Column: Clean, Secure Login Form */}
          <div className="col-span-1 lg:col-span-7 p-6 sm:p-10 flex flex-col justify-between">
            <div>
              {/* Mobile Brand Header */}
              <div className="flex lg:hidden items-center gap-3 mb-6 pb-4 border-b border-slate-100">
                <div className="w-10 h-10 rounded-xl bg-[#0c4a26] text-white flex items-center justify-center shrink-0 shadow-sm">
                  <Store className="w-5 h-5 text-emerald-300" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900 leading-tight">Fresh & More M-POS</h2>
                  <p className="text-xs text-slate-500">Retail & Grocery Management</p>
                </div>
              </div>

              {/* Form Title & Welcome Message */}
              <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Login to Web App</h1>
                  <p className="text-sm text-slate-500 mt-1">
                    Sign in with your registered phone number or email address
                  </p>
                </div>
                {onBackToWebsite && (
                  <button
                    type="button"
                    onClick={onBackToWebsite}
                    className="self-start sm:self-center inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-colors shadow-2xs cursor-pointer shrink-0"
                    title="Return to Public Grocery Website"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Return to Website</span>
                  </button>
                )}
              </div>

              {/* Error Alert Box */}
              {error && (
                <div
                  className="mb-5 p-3.5 rounded-xl bg-red-50/90 border border-red-200 text-xs text-red-700 flex items-start gap-2.5 animate-in fade-in duration-200"
                  role="alert"
                >
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  <div className="flex-1 font-medium leading-relaxed">{error}</div>
                </div>
              )}

              {/* Lockout Warning if rate limited */}
              {lockoutSeconds > 0 && (
                <div className="mb-5 p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-600 animate-spin shrink-0" />
                  <span>
                    Temporary security lockout active. You may attempt login in{' '}
                    <strong className="font-mono tabular-nums">{lockoutSeconds}s</strong>.
                  </span>
                </div>
              )}

              {/* Main Login Form */}
              <form onSubmit={handleSubmit} className="space-y-4.5" noValidate>
                {/* 1. Single Login Identifier Field (Phone or Email) */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label htmlFor="login-identifier" className="text-xs font-semibold text-slate-700">
                      Phone Number or Email
                    </label>
                    {/* Quiet inline indicator showing detected type without noisy pill boxes */}
                    {identifierType !== 'empty' && (
                      <span className="text-[11px] text-slate-500 flex items-center gap-1 font-medium">
                        {identifierType === 'phone' ? (
                          <>
                            <Phone className="w-3 h-3 text-emerald-600" />
                            <span>Rwanda Phone (+250)</span>
                          </>
                        ) : (
                          <>
                            <Mail className="w-3 h-3 text-blue-600" />
                            <span>Email Address</span>
                          </>
                        )}
                      </span>
                    )}
                  </div>

                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      {identifierType === 'phone' ? (
                        <Phone className="w-4 h-4 text-emerald-700" />
                      ) : identifierType === 'email' ? (
                        <Mail className="w-4 h-4 text-blue-700" />
                      ) : (
                        <UserCheck className="w-4 h-4" />
                      )}
                    </div>
                    <input
                      id="login-identifier"
                      type="text"
                      autoComplete="username"
                      disabled={loading || lockoutSeconds > 0}
                      value={identifier}
                      onChange={(e) => {
                        setIdentifier(e.target.value);
                        if (error) setError(null);
                      }}
                      placeholder="Enter your registered phone number or email"
                      className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0c4a26] focus:border-transparent transition-all disabled:opacity-60"
                    />
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Accepts +250 7xx xxx xxx, 07xxxxxxxx, or username@freshandmore.rw
                  </p>
                </div>

                {/* 2. Password Field with Visibility Toggle */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label htmlFor="login-password" className="text-xs font-semibold text-slate-700">
                      Password
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setForgotIdentifier(identifier);
                        setForgotError(null);
                        setForgotSuccess(null);
                        setForgotStep('request');
                        setForgotModalOpen(true);
                      }}
                      className="text-xs font-medium text-emerald-800 hover:text-emerald-950 transition-colors cursor-pointer"
                    >
                      Forgot Password?
                    </button>
                  </div>

                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      id="login-password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      disabled={loading || lockoutSeconds > 0}
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        if (error) setError(null);
                      }}
                      placeholder="Enter your password"
                      className="w-full pl-10 pr-11 py-3 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0c4a26] focus:border-transparent transition-all disabled:opacity-60"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-700 cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* 3. Remember Me Checkbox */}
                <div className="flex items-center justify-between pt-1">
                  <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="w-4 h-4 rounded border-slate-300 text-[#0c4a26] focus:ring-[#0c4a26]"
                    />
                    <span>Remember my login on this terminal</span>
                  </label>
                </div>

                {/* 4. Primary Login to POS Button */}
                <button
                  type="submit"
                  disabled={loading || lockoutSeconds > 0}
                  className="w-full h-12 bg-[#0c4a26] hover:bg-[#093a1d] active:scale-[0.99] text-white text-sm font-semibold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <RotateCw className="w-4 h-4 animate-spin" />
                      <span>Verifying Credentials...</span>
                    </>
                  ) : (
                    <>
                      <span>Login to POS</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* Bottom Footer Actions */}
            <div className="mt-8 pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
              <button
                type="button"
                onClick={() => setSupportModalOpen(true)}
                className="hover:text-slate-900 transition-colors flex items-center gap-1 cursor-pointer font-medium"
              >
                <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
                <span>Contact POS Support</span>
              </button>

              <div className="text-[11px] text-slate-400 text-center sm:text-right">
                <span>© {new Date().getFullYear()} Fresh & More M-POS</span>
                <span className="mx-1.5" aria-hidden="true">
                  ·
                </span>
                <span>All rights reserved</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* Forgot Password Modal Dialog                                  */}
      {/* ============================================================ */}
      {forgotModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl w-full max-w-md p-6 sm:p-7 shadow-2xl border border-slate-200 relative animate-in zoom-in-95 duration-150 text-slate-900">
            <button
              onClick={() => setForgotModalOpen(false)}
              className="absolute top-5 right-5 p-1.5 rounded-full text-slate-400 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-[#0c4a26] flex items-center justify-center mb-4">
              <KeyRound className="w-6 h-6" />
            </div>

            <h3 className="text-xl font-bold text-slate-900">Reset Your Password</h3>
            <p className="text-xs text-slate-500 mt-1">
              Securely reset your password using your registered phone number or email address.
            </p>

            {forgotError && (
              <div className="mt-4 p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
                <span>{forgotError}</span>
              </div>
            )}

            {forgotSuccess && (
              <div className="mt-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
                <span>{forgotSuccess}</span>
              </div>
            )}

            {/* Simulated verification code display for demo review */}
            {simulatedCodeReceived && (
              <div className="mt-3 p-3 rounded-xl bg-blue-50 border border-blue-200 text-xs text-blue-900">
                <p className="font-semibold text-blue-900">Simulated SMS / Email Dispatch:</p>
                <p className="text-blue-700 mt-0.5">
                  Verification Code:{' '}
                  <strong className="font-mono text-sm tracking-wider text-blue-950 bg-white px-2 py-0.5 rounded border border-blue-300">
                    {simulatedCodeReceived}
                  </strong>{' '}
                  (Expires in 10 minutes)
                </p>
              </div>
            )}

            {forgotStep === 'request' ? (
              <form onSubmit={handleRequestResetCode} className="mt-5 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Registered Phone Number or Email
                  </label>
                  <input
                    type="text"
                    value={forgotIdentifier}
                    onChange={(e) => setForgotIdentifier(e.target.value)}
                    placeholder="e.g. marie@freshandmore.rw or +250 785 112 900"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0c4a26]"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setForgotModalOpen(false)}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={forgotLoading}
                    className="px-5 py-2.5 text-xs font-semibold text-white bg-[#0c4a26] hover:bg-[#093a1d] rounded-xl transition-colors shadow-sm cursor-pointer disabled:opacity-60 flex items-center gap-1.5"
                  >
                    {forgotLoading ? (
                      <RotateCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <span>Send Verification Code</span>
                    )}
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleCompleteReset} className="mt-5 space-y-3.5 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    6-Digit Verification Code
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    value={forgotCode}
                    onChange={(e) => setForgotCode(e.target.value)}
                    placeholder="Enter 6-digit code"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 font-mono tracking-widest text-center text-sm font-bold focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0c4a26]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">New Password</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Minimum 6 characters"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0c4a26]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Confirm New Password</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter new password"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0c4a26]"
                  />
                </div>

                <div className="flex items-center justify-between pt-2">
                  <button
                    type="button"
                    onClick={() => setForgotStep('request')}
                    className="text-slate-500 hover:text-slate-800 font-medium cursor-pointer"
                  >
                    Back
                  </button>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setForgotModalOpen(false)}
                      className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={forgotLoading}
                      className="px-5 py-2.5 text-xs font-semibold text-white bg-[#0c4a26] hover:bg-[#093a1d] rounded-xl transition-colors shadow-sm cursor-pointer disabled:opacity-60 flex items-center gap-1.5"
                    >
                      {forgotLoading ? (
                        <RotateCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <span>Update Password & Login</span>
                      )}
                    </button>
                  </div>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* Contact POS Support Modal                                     */}
      {/* ============================================================ */}
      {supportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl border border-slate-200 relative animate-in zoom-in-95 duration-150 text-slate-900">
            <button
              onClick={() => setSupportModalOpen(false)}
              className="absolute top-5 right-5 p-1.5 rounded-full text-slate-400 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-[#0c4a26] flex items-center justify-center mb-4">
              <Store className="w-6 h-6" />
            </div>

            <h3 className="text-lg font-bold text-slate-900">POS Technical Support</h3>
            <p className="text-xs text-slate-500 mt-0.5">Fresh & More IT Operations Desk</p>

            <div className="mt-4 space-y-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                <p className="font-semibold text-slate-800">Store Support Hotline</p>
                <p className="font-mono text-emerald-800 mt-0.5 font-bold">+250 788 000 111</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Mon - Sun: 06:00 AM – 11:00 PM CAT</p>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                <p className="font-semibold text-slate-800">IT Helpdesk Email</p>
                <p className="font-mono text-slate-700 mt-0.5">support@freshandmore.rw</p>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                <p className="font-semibold text-slate-800">Main Office</p>
                <p className="text-slate-600 mt-0.5">Kigali Heights, 4th Floor, Gasabo, Kigali</p>
              </div>
            </div>

            <button
              onClick={() => setSupportModalOpen(false)}
              className="w-full mt-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
