import { useEffect, useState } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { login, clearError } from '@/store/authSlice';
import { api } from '@/services/api';
import { HiEye, HiEyeOff } from 'react-icons/hi';
import logo from '@/assets/logo.svg';

type LoginMode = 'login' | 'forgot' | 'reset';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [mode, setMode] = useState<LoginMode>('login');
  const [flowLoading, setFlowLoading] = useState(false);
  const [flowError, setFlowError] = useState<string | null>(null);
  const [flowMessage, setFlowMessage] = useState<string | null>(null);
  const dispatch = useAppDispatch();
  const { loading, error } = useAppSelector((state) => state.auth);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const redirectUrl = searchParams.get('redirect');

  useEffect(() => {
    const token = searchParams.get('token') || searchParams.get('resetToken');
    const emailParam = searchParams.get('email');
    if (emailParam) {
      setEmail(emailParam);
    }
    if (token) {
      setResetToken(token);
      setMode('reset');
    }
  }, [searchParams]);

  const clearFlowState = () => {
    setFlowError(null);
    setFlowMessage(null);
    dispatch(clearError());
  };

  const getErrorMessage = (err: any, fallback: string) =>
    err?.response?.data?.message || err?.message || fallback;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearFlowState();

    try {
      const result = await dispatch(login({ email, password })).unwrap();
      const loggedInUser = result?.user;
      
      // Wait a moment to ensure state is fully persisted and API headers are set
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Verify token is set before redirecting
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('Token not found after login');
        return;
      }
      
      const safeRedirect = redirectUrl?.startsWith('/') ? redirectUrl : null;

      // Redirect based on user type
      if (safeRedirect) {
        navigate(safeRedirect);
      } else if (loggedInUser?.userType === 'PROFESSIONAL') {
        navigate('/professional');
      } else if (loggedInUser?.userType === 'ORGANISATION') {
        try {
          const orgResponse = await api.get('/v1/organisation/profile');
          const org = orgResponse.data?.data || {};
          const isNewOrganisation = org.setupCompleted === false;
          const isVerifiedOrganisation = org.verificationStatus === 'verified';

          if (isNewOrganisation || !isVerifiedOrganisation) {
            const orgId = org.id || loggedInUser?.organisationId;
            navigate(
              orgId
                ? `/organization/account-active?id=${encodeURIComponent(orgId)}`
                : '/organization/account-active',
            );
          } else {
            navigate('/organization');
          }
        } catch {
          navigate('/organization');
        }
      } else if (loggedInUser?.userType === 'ADMIN') {
        navigate('/admin');
      } else {
        navigate('/login');
      }
    } catch (err: any) {
      // Error is handled by Redux
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    clearFlowState();

    if (!email.trim()) {
      setFlowError('Enter your email address to reset your password.');
      return;
    }

    setFlowLoading(true);
    try {
      const response = await api.post('/v1/auth/forgot-password', {
        email: email.trim(),
      });
      setFlowMessage(
        response.data?.message ||
          'If the email exists, a password reset code has been sent.'
      );
      setPassword('');
      setConfirmPassword('');
      setMode('reset');
    } catch (err: any) {
      setFlowError(getErrorMessage(err, 'Failed to request password reset'));
    } finally {
      setFlowLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    clearFlowState();

    if (!resetToken.trim()) {
      setFlowError('Enter the reset code from your email.');
      return;
    }
    if (password !== confirmPassword) {
      setFlowError('Passwords do not match.');
      return;
    }

    setFlowLoading(true);
    try {
      const response = await api.post('/v1/auth/reset-password', {
        token: resetToken.trim(),
        password,
        confirmPassword,
      });
      setFlowMessage(response.data?.message || 'Password reset successfully. You can now sign in.');
      setPassword('');
      setConfirmPassword('');
      setResetToken('');
      setSearchParams({});
      setMode('login');
    } catch (err: any) {
      setFlowError(getErrorMessage(err, 'Failed to reset password'));
    } finally {
      setFlowLoading(false);
    }
  };

  const showLogin = () => {
    clearFlowState();
    setMode('login');
  };

  const showForgot = () => {
    clearFlowState();
    setMode('forgot');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4 py-10">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="text-center">
          <Link to="/" className="inline-flex justify-center mb-8">
            <img src={logo} alt="Taldium" className="h-9" />
          </Link>
          <h2 className="text-2xl font-semibold tracking-tight text-slate-950">
            {mode === 'login' && 'Sign in to Taldium'}
            {mode === 'forgot' && 'Reset your password'}
            {mode === 'reset' && 'Create a new password'}
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            {mode === 'login' && 'Welcome back. Enter your details to continue.'}
            {mode === 'forgot' && 'Enter your email and we will send you a reset code.'}
            {mode === 'reset' && 'Enter the code from your email and choose a new password.'}
          </p>
        </div>
        <form
          className="mt-8 space-y-6"
          onSubmit={
            mode === 'login'
              ? handleSubmit
              : mode === 'forgot'
                ? handleForgotPassword
                : handleResetPassword
          }
        >
          {(mode === 'login' ? error : flowError) && (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {mode === 'login' ? error : flowError}
            </div>
          )}
          {flowMessage && (
            <div className="rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
              {flowMessage}
            </div>
          )}
          <div className="space-y-4">
            {mode !== 'reset' && (
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-slate-700">
                  Email Address
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-2 block w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-950 placeholder-slate-400 shadow-sm outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
                  placeholder="Email address"
                />
              </div>
            )}
            {mode !== 'forgot' && (
              <div>
                <div className="flex items-center justify-between">
                  <label htmlFor="password" className="block text-sm font-medium text-slate-700">
                    {mode === 'reset' ? 'New Password' : 'Password'}
                  </label>
                  {mode === 'login' && (
                    <button
                      type="button"
                      onClick={showForgot}
                      className="text-sm font-medium text-brand-600 hover:text-brand-700"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <div className="relative mt-2">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 pr-12 text-slate-950 placeholder-slate-400 shadow-sm outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
                    placeholder={mode === 'reset' ? 'New password' : 'Password'}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 flex items-center pr-4 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? (
                      <HiEyeOff className="h-5 w-5" />
                    ) : (
                      <HiEye className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>
            )}
            {mode === 'reset' && (
              <>
                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-700">
                    Confirm New Password
                  </label>
                  <div className="relative mt-2">
                    <input
                      id="confirmPassword"
                      name="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="block w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 pr-12 text-slate-950 placeholder-slate-400 shadow-sm outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
                      placeholder="Confirm new password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute inset-y-0 right-0 flex items-center pr-4 text-slate-400 hover:text-slate-600"
                    >
                      {showConfirmPassword ? (
                        <HiEyeOff className="h-5 w-5" />
                      ) : (
                        <HiEye className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                </div>
                <div>
                  <label htmlFor="resetToken" className="block text-sm font-medium text-slate-700">
                    Reset Code
                  </label>
                  <input
                    id="resetToken"
                    name="resetToken"
                    type="text"
                    required
                    value={resetToken}
                    onChange={(e) => setResetToken(e.target.value)}
                    className="mt-2 block w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-950 placeholder-slate-400 shadow-sm outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
                    placeholder="Enter reset code"
                  />
                </div>
              </>
            )}
          </div>

          <div>
            <button
              type="submit"
              disabled={loading || flowLoading}
              className="flex w-full justify-center rounded-2xl bg-brand-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700 focus:outline-none focus:ring-4 focus:ring-brand-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {mode === 'login' && (loading ? 'Signing in...' : 'Sign in')}
              {mode === 'forgot' && (flowLoading ? 'Sending...' : 'Send reset code')}
              {mode === 'reset' && (flowLoading ? 'Resetting...' : 'Reset password')}
            </button>
          </div>

          <div className="text-center">
            {mode === 'login' ? (
              <div className="space-y-3 border-t border-slate-100 pt-6">
                <p className="text-sm text-slate-500">New to Taldium?</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Link
                    to="/join"
                    className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-900 transition hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700"
                  >
                    Join as Professional
                  </Link>
                  <Link
                    to="/register-business"
                    className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-900 transition hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700"
                  >
                    Join as Organisation
                  </Link>
                </div>
              </div>
            ) : (
              <>
                {mode === 'forgot' && (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        clearFlowState();
                        setMode('reset');
                      }}
                      className="text-sm font-medium text-brand-600 hover:text-brand-700"
                    >
                      Already have a reset code?
                    </button>
                    <br />
                  </>
                )}
                <button
                  type="button"
                  onClick={showLogin}
                  className="text-sm font-medium text-brand-600 hover:text-brand-700"
                >
                  Back to sign in
                </button>
              </>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}

