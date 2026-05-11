import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, Eye, EyeOff, Mail, Lock, User, RefreshCw } from 'lucide-react';
import { authAPI } from '../api';
import { useAuth } from '../AuthContext';

function TabButton({ active, children, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-4 py-2 text-sm font-semibold transition ${active ? 'bg-slate-900 text-white shadow-lg shadow-slate-900/20' : 'bg-white/80 text-slate-700 hover:bg-white'}`}
    >
      {children}
    </button>
  );
}

function InputField({ label, icon: Icon, type = 'text', value, onChange, name, placeholder, autoComplete, rightSlot, required = true }) {
  return (
    <label className="block">
      <span className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-700">
        <Icon size={16} />
        {label}
      </span>
      <div className="relative">
        <input
          type={type}
          name={name}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          autoComplete={autoComplete}
          required={required}
          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-4 focus:ring-slate-900/5"
        />
        {rightSlot && <div className="absolute inset-y-0 right-3 flex items-center">{rightSlot}</div>}
      </div>
    </label>
  );
}

function AuthCard({ title, subtitle, children, accent, highlight }) {
  return (
    <section className={`rounded-[28px] border bg-white p-6 shadow-[0_30px_80px_rgba(15,23,42,0.12)] transition ${highlight ? 'border-slate-900/20 ring-4 ring-slate-900/5' : 'border-slate-200/80'}`}>
      <div className={`mb-6 inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] ${accent}`}>
        {title}
      </div>
      <h2 className="text-2xl font-bold text-slate-950">{subtitle}</h2>
      <div className="mt-6">{children}</div>
    </section>
  );
}

export function AuthPage({ initialMode = 'login' }) {
  const [mode, setMode] = useState(initialMode);
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [showSignupConfirm, setShowSignupConfirm] = useState(false);
  const [loginData, setLoginData] = useState({ email: '', password: '' });
  const [signupData, setSignupData] = useState({ name: '', email: '', password: '', confirmPassword: '' });
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotResult, setForgotResult] = useState('');
  const [resetLink, setResetLink] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const highlightLogin = useMemo(() => mode === 'login', [mode]);
  const highlightSignup = useMemo(() => mode === 'signup', [mode]);
  const modeRoutes = {
    login: '/login',
    signup: '/signup',
    forgot: '/forgot-password'
  };

  const changeMode = (nextMode) => {
    setMode(nextMode);
    navigate(modeRoutes[nextMode]);
  };

  const handleLoginChange = (event) => {
    const { name, value } = event.target;
    setLoginData((previous) => ({ ...previous, [name]: value }));
  };

  const handleSignupChange = (event) => {
    const { name, value } = event.target;
    setSignupData((previous) => ({ ...previous, [name]: value }));
  };

  const handleLogin = async (event) => {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await authAPI.login(loginData.email, loginData.password);
      login(response.data.token, response.data.user);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (event) => {
    event.preventDefault();
    setError('');

    if (signupData.password !== signupData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      const response = await authAPI.signup(signupData.email, signupData.password, signupData.name);
      login(response.data.token, response.data.user);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (event) => {
    event.preventDefault();
    setError('');
    setForgotResult('');
    setResetLink('');
    setLoading(true);

    try {
      const response = await authAPI.forgotPassword(forgotEmail);
      setForgotResult(response.data.message);
      if (response.data.resetUrl) {
        setResetLink(response.data.resetUrl);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Unable to send reset email');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_#dbeafe_0,_transparent_35%),radial-gradient(circle_at_bottom_right,_#e2e8f0_0,_transparent_28%),linear-gradient(135deg,_#f8fafc_0%,_#eef2ff_100%)] px-4 py-8 text-slate-900">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-7xl items-center">
        <div className="grid w-full gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <aside className="overflow-hidden rounded-[32px] border border-white/60 bg-slate-950 p-8 text-white shadow-[0_30px_80px_rgba(15,23,42,0.28)]">
            <div className="inline-flex items-center rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-slate-200">
              Team Task Manager
            </div>
            <h1 className="mt-6 max-w-md text-4xl font-black leading-tight sm:text-5xl">
              Clean team coordination without the clutter.
            </h1>
            <p className="mt-4 max-w-lg text-base leading-7 text-slate-300">
              Login, signup, and password recovery now live on one polished screen. The reset flow works by email when SMTP is configured, and falls back to a local reset link for testing.
            </p>

            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-white/6 p-4 backdrop-blur">
                <p className="text-sm text-slate-300">Security</p>
                <p className="mt-1 text-lg font-semibold">Session tokens + password reset tokens</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/6 p-4 backdrop-blur">
                <p className="text-sm text-slate-300">UX</p>
                <p className="mt-1 text-lg font-semibold">Side-by-side auth cards</p>
              </div>
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              <TabButton active={mode === 'login'} onClick={() => changeMode('login')}>Login</TabButton>
              <TabButton active={mode === 'signup'} onClick={() => changeMode('signup')}>Sign up</TabButton>
              <TabButton active={mode === 'forgot'} onClick={() => changeMode('forgot')}>Forgot password</TabButton>
            </div>

            <p className="mt-8 text-sm text-slate-400">
              Professional, single-screen auth with a classic layout and a practical reset path.
            </p>
          </aside>

          <main className="space-y-4">
            {error && (
              <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-red-800 shadow-sm">
                <div className="flex items-start gap-3">
                  <AlertCircle size={18} className="mt-0.5 shrink-0" />
                  <p className="text-sm">{error}</p>
                </div>
              </div>
            )}

            {mode === 'forgot' ? (
              <AuthCard
                title="Password recovery"
                subtitle="Send a reset link"
                accent="bg-amber-100 text-amber-900"
                highlight
              >
                <form onSubmit={handleForgotPassword} className="space-y-4">
                  <InputField
                    label="Email"
                    icon={Mail}
                    type="email"
                    value={forgotEmail}
                    onChange={(event) => setForgotEmail(event.target.value)}
                    name="forgotEmail"
                    placeholder="you@example.com"
                    autoComplete="email"
                  />

                  <button
                    type="submit"
                    disabled={loading}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <RefreshCw size={18} />
                    {loading ? 'Sending reset link...' : 'Send reset email'}
                  </button>
                </form>

                {forgotResult && (
                  <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-900">
                    <p className="text-sm font-semibold">{forgotResult}</p>
                    {resetLink && (
                      <p className="mt-2 break-all text-sm">
                        Local reset link: <a href={resetLink} className="underline">{resetLink}</a>
                      </p>
                    )}
                  </div>
                )}

                <div className="mt-6 flex flex-wrap gap-3 text-sm">
                  <button type="button" onClick={() => changeMode('login')} className="font-semibold text-slate-700 underline-offset-4 hover:underline">Back to login</button>
                  <button type="button" onClick={() => changeMode('signup')} className="font-semibold text-slate-700 underline-offset-4 hover:underline">Create account</button>
                </div>
              </AuthCard>
            ) : (
              <div className="grid gap-6 lg:grid-cols-2">
                <AuthCard
                  title="Login"
                  subtitle="Welcome back"
                  accent="bg-slate-100 text-slate-900"
                  highlight={highlightLogin}
                >
                  <form onSubmit={handleLogin} className="space-y-4">
                    <InputField
                      label="Email"
                      icon={Mail}
                      type="email"
                      name="email"
                      value={loginData.email}
                      onChange={handleLoginChange}
                      placeholder="you@example.com"
                      autoComplete="email"
                    />
                    <InputField
                      label="Password"
                      icon={Lock}
                      type={showLoginPassword ? 'text' : 'password'}
                      name="password"
                      value={loginData.password}
                      onChange={handleLoginChange}
                      placeholder="Enter your password"
                      autoComplete="current-password"
                      rightSlot={(
                        <button type="button" onClick={() => setShowLoginPassword((value) => !value)} className="text-slate-500 hover:text-slate-900">
                          {showLoginPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      )}
                    />

                    <button
                      type="submit"
                      disabled={loading}
                      className="inline-flex w-full items-center justify-center rounded-2xl bg-slate-950 px-4 py-3 font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {loading ? 'Logging in...' : 'Login'}
                    </button>

                    <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
                      <button type="button" onClick={() => changeMode('forgot')} className="font-semibold text-slate-700 underline-offset-4 hover:underline">
                        Forgot password?
                      </button>
                      <button type="button" onClick={() => changeMode('signup')} className="font-semibold text-slate-700 underline-offset-4 hover:underline">
                        Create account
                      </button>
                    </div>
                  </form>
                </AuthCard>

                <AuthCard
                  title="Sign up"
                  subtitle="Create your account"
                  accent="bg-indigo-100 text-indigo-900"
                  highlight={highlightSignup}
                >
                  <form onSubmit={handleSignup} className="space-y-4">
                    <InputField
                      label="Name"
                      icon={User}
                      type="text"
                      name="name"
                      value={signupData.name}
                      onChange={handleSignupChange}
                      placeholder="Your name"
                      autoComplete="name"
                    />
                    <InputField
                      label="Email"
                      icon={Mail}
                      type="email"
                      name="email"
                      value={signupData.email}
                      onChange={handleSignupChange}
                      placeholder="you@example.com"
                      autoComplete="email"
                    />
                    <InputField
                      label="Password"
                      icon={Lock}
                      type={showSignupPassword ? 'text' : 'password'}
                      name="password"
                      value={signupData.password}
                      onChange={handleSignupChange}
                      placeholder="Create a password"
                      autoComplete="new-password"
                      rightSlot={(
                        <button type="button" onClick={() => setShowSignupPassword((value) => !value)} className="text-slate-500 hover:text-slate-900">
                          {showSignupPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      )}
                    />
                    <InputField
                      label="Confirm password"
                      icon={Lock}
                      type={showSignupConfirm ? 'text' : 'password'}
                      name="confirmPassword"
                      value={signupData.confirmPassword}
                      onChange={handleSignupChange}
                      placeholder="Repeat your password"
                      autoComplete="new-password"
                      rightSlot={(
                        <button type="button" onClick={() => setShowSignupConfirm((value) => !value)} className="text-slate-500 hover:text-slate-900">
                          {showSignupConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      )}
                    />

                    <button
                      type="submit"
                      disabled={loading}
                      className="inline-flex w-full items-center justify-center rounded-2xl bg-indigo-600 px-4 py-3 font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {loading ? 'Creating account...' : 'Sign up'}
                    </button>

                    <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
                      <button type="button" onClick={() => changeMode('login')} className="font-semibold text-slate-700 underline-offset-4 hover:underline">
                        Already have an account?
                      </button>
                      <button type="button" onClick={() => changeMode('forgot')} className="font-semibold text-slate-700 underline-offset-4 hover:underline">
                        Forgot password?
                      </button>
                    </div>
                  </form>
                </AuthCard>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}