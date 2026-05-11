import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { AlertCircle, Eye, EyeOff, Lock } from 'lucide-react';
import { authAPI } from '../api';

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setMessage('');

    if (!token) {
      setError('Reset token is missing. Use the link from your email again.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      const response = await authAPI.resetPassword(token, password);
      setMessage(response.data.message);
      setTimeout(() => navigate('/login'), 1200);
    } catch (err) {
      setError(err.response?.data?.error || 'Unable to reset password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_#dbeafe_0,_transparent_35%),linear-gradient(135deg,_#f8fafc_0%,_#eef2ff_100%)] px-4 py-8">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-2xl items-center justify-center">
        <div className="w-full rounded-[32px] border border-white/70 bg-white p-8 shadow-[0_30px_80px_rgba(15,23,42,0.12)]">
          <div className="inline-flex rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-emerald-900">
            Reset password
          </div>
          <h1 className="mt-4 text-3xl font-black text-slate-950">Choose a new password</h1>
          <p className="mt-2 text-slate-600">Enter your new password twice to secure your account.</p>

          {error && (
            <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-800">
              <div className="flex gap-3">
                <AlertCircle size={18} className="mt-0.5 shrink-0" />
                <p className="text-sm">{error}</p>
              </div>
            </div>
          )}

          {message && (
            <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-900">
              <p className="text-sm font-semibold">{message}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <label className="block">
              <span className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-700">
                <Lock size={16} /> New password
              </span>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 pr-12 text-slate-900 shadow-sm outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-900/5"
                  required
                />
                <button type="button" onClick={() => setShowPassword((value) => !value)} className="absolute inset-y-0 right-3 flex items-center text-slate-500 hover:text-slate-900">
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </label>

            <label className="block">
              <span className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-700">
                <Lock size={16} /> Confirm password
              </span>
              <div className="relative">
                <input
                  type={showConfirm ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 pr-12 text-slate-900 shadow-sm outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-900/5"
                  required
                />
                <button type="button" onClick={() => setShowConfirm((value) => !value)} className="absolute inset-y-0 right-3 flex items-center text-slate-500 hover:text-slate-900">
                  {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </label>

            <button
              type="submit"
              disabled={loading}
              className="inline-flex w-full items-center justify-center rounded-2xl bg-slate-950 px-4 py-3 font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? 'Updating password...' : 'Update password'}
            </button>

            <p className="text-center text-sm text-slate-600">
              Remembered your password?{' '}
              <Link to="/login" className="font-semibold text-slate-900 underline-offset-4 hover:underline">
                Back to login
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}