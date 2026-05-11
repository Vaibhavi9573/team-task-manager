import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AlertCircle, Eye, EyeOff } from 'lucide-react';
import { authAPI } from '../api';
import { useAuth } from '../AuthContext';

export function AuthPage({ initialMode = 'login' }) {
  const [mode, setMode] = useState(initialMode);
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [showSignupConfirm, setShowSignupConfirm] = useState(false);
  const [loginData, setLoginData] = useState({ email: '', password: '' });
  const [signupData, setSignupData] = useState({ name: '', email: '', password: '', confirmPassword: '' });
  const [forgotEmail, setForgotEmail] = useState('');
  const [message, setMessage] = useState('');
  const [resetLink, setResetLink] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { login } = useAuth();

  const currentMode = searchParams.get('mode') || mode;

  const handleModeChange = (newMode) => {
    setMode(newMode);
    const routes = { login: '/login', signup: '/signup', forgot: '/forgot-password' };
    navigate(routes[newMode]);
    setError('');
    setMessage('');
    setResetLink('');
  };

  const handleLoginChange = (event) => {
    const { name, value } = event.target;
    setLoginData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSignupChange = (event) => {
    const { name, value } = event.target;
    setSignupData((prev) => ({ ...prev, [name]: value }));
  };

  const handleLogin = async (event) => {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await authAPI.login(loginData.email, loginData.password);
      login(response.data.token, response.data.user);
      navigate(response.data.user?.role === 'admin' ? '/admin' : '/dashboard');
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

    if (signupData.password.length < 8 || !/[A-Z]/.test(signupData.password) || !/[a-z]/.test(signupData.password) || !/\d/.test(signupData.password) || !/[^A-Za-z0-9]/.test(signupData.password)) {
      setError('Password must contain uppercase, lowercase, number, special character, and be at least 8 characters');
      return;
    }

    setLoading(true);

    try {
      const response = await authAPI.signup(signupData.email, signupData.password, signupData.name);
      login(response.data.token, response.data.user);
      navigate(response.data.user?.role === 'admin' ? '/admin' : '/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (event) => {
    event.preventDefault();
    setError('');
    setMessage('');
    setResetLink('');
    setLoading(true);

    try {
      const response = await authAPI.forgotPassword(forgotEmail);
      setMessage(response.data.message);
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
    <div className="min-h-screen bg-white flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        {/* Header Navigation */}
        <div className="flex gap-3 mb-8">
          <button
            onClick={() => handleModeChange('login')}
            className={`flex-1 py-3 px-4 rounded-lg font-semibold text-center transition ${
              (currentMode === 'login' || mode === 'login')
                ? 'bg-blue-700 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Login
          </button>
          <button
            onClick={() => handleModeChange('signup')}
            className={`flex-1 py-3 px-4 rounded-lg font-semibold text-center transition ${
              mode === 'signup'
                ? 'bg-blue-700 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Sign Up
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex gap-3">
            <AlertCircle className="text-red-600 flex-shrink-0 mt-0.5" size={20} />
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        {/* Success Message */}
        {message && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-green-700 text-sm font-medium">{message}</p>
            {resetLink && (
              <p className="text-green-600 text-xs mt-2 break-all">
                Reset link: <a href={resetLink} className="underline font-semibold">{resetLink}</a>
              </p>
            )}
          </div>
        )}

        {/* Login Form */}
        {mode === 'login' && (
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Login</h1>
            <p className="text-gray-600 mb-8">Enter email and password to continue.</p>

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <input
                  type="email"
                  name="email"
                  value={loginData.email}
                  onChange={handleLoginChange}
                  placeholder="Enter email"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div className="relative">
                <input
                  type={showLoginPassword ? 'text' : 'password'}
                  name="password"
                  value={loginData.password}
                  onChange={handleLoginChange}
                  placeholder="Enter password"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 pr-12"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowLoginPassword(!showLoginPassword)}
                  className="absolute right-3 top-3 text-gray-500 hover:text-gray-700"
                >
                  {showLoginPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-700 hover:bg-blue-800 text-white font-semibold py-3 rounded-lg transition disabled:opacity-50 mt-6"
              >
                {loading ? 'Logging in...' : 'Login'}
              </button>
            </form>

            <div className="mt-6 flex flex-col gap-3 text-sm">
              <button
                onClick={() => handleModeChange('forgot')}
                className="text-blue-600 hover:text-blue-800 underline text-left"
              >
                Forgot password?
              </button>
              <div>
                <span className="text-gray-600">New user? </span>
                <button
                  onClick={() => handleModeChange('signup')}
                  className="text-blue-600 hover:text-blue-800 underline font-semibold"
                >
                  Sign up now
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Signup Form */}
        {mode === 'signup' && (
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Sign Up</h1>
            <p className="text-gray-600 mb-8">Create your account to get started.</p>

            <form onSubmit={handleSignup} className="space-y-4">
              <div>
                <input
                  type="text"
                  name="name"
                  value={signupData.name}
                  onChange={handleSignupChange}
                  placeholder="Enter your name"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <input
                  type="email"
                  name="email"
                  value={signupData.email}
                  onChange={handleSignupChange}
                  placeholder="Enter email"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div className="relative">
                <input
                  type={showSignupPassword ? 'text' : 'password'}
                  name="password"
                  value={signupData.password}
                  onChange={handleSignupChange}
                  placeholder="Create a password"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 pr-12"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowSignupPassword(!showSignupPassword)}
                  className="absolute right-3 top-3 text-gray-500 hover:text-gray-700"
                >
                  {showSignupPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>

              <div className="relative">
                <input
                  type={showSignupConfirm ? 'text' : 'password'}
                  name="confirmPassword"
                  value={signupData.confirmPassword}
                  onChange={handleSignupChange}
                  placeholder="Confirm password"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 pr-12"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowSignupConfirm(!showSignupConfirm)}
                  className="absolute right-3 top-3 text-gray-500 hover:text-gray-700"
                >
                  {showSignupConfirm ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>

              <p className="text-xs text-gray-600">
                Password must contain uppercase, lowercase, number, special character, and 8+ characters.
              </p>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-700 hover:bg-blue-800 text-white font-semibold py-3 rounded-lg transition disabled:opacity-50 mt-6"
              >
                {loading ? 'Creating account...' : 'Sign up'}
              </button>
            </form>

            <div className="mt-6 text-sm">
              <span className="text-gray-600">Already have an account? </span>
              <button
                onClick={() => handleModeChange('login')}
                className="text-blue-600 hover:text-blue-800 underline font-semibold"
              >
                Login
              </button>
            </div>
          </div>
        )}

        {/* Forgot Password Form */}
        {mode === 'forgot' && (
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Forgot Password?</h1>
            <p className="text-gray-600 mb-8">Enter your email to receive a reset link.</p>

            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div>
                <input
                  type="email"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  placeholder="Enter your email"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-700 hover:bg-blue-800 text-white font-semibold py-3 rounded-lg transition disabled:opacity-50 mt-6"
              >
                {loading ? 'Sending...' : 'Send Reset Email'}
              </button>
            </form>

            <div className="mt-6 flex gap-3 text-sm">
              <button
                onClick={() => handleModeChange('login')}
                className="text-blue-600 hover:text-blue-800 underline"
              >
                Back to login
              </button>
              <button
                onClick={() => handleModeChange('signup')}
                className="text-blue-600 hover:text-blue-800 underline"
              >
                Create account
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}