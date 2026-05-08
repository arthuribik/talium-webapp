import { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { api, setLoginTime } from '@/services/api';

const PASSWORD_HINT =
  'At least 8 characters with uppercase, lowercase, number, and a special character (@$!%*?&).';

export default function AcceptAdminInvite() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = useMemo(() => searchParams.get('token')?.trim() ?? '', [searchParams]);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      toast.error('Missing invitation token in the link.');
      return;
    }
    if (password !== confirm) {
      toast.error('Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      const res = await api.post('/v1/admin/onboarding/complete', {
        invitationToken: token,
        password,
        confirmPassword: confirm,
      });
      const accessToken = res.data?.data?.tokens?.accessToken;
      const refreshToken = res.data?.data?.tokens?.refreshToken;
      const user = res.data?.data?.user;
      if (accessToken) {
        localStorage.setItem('token', accessToken);
        if (refreshToken) localStorage.setItem('refreshToken', refreshToken);
        if (user) {
          localStorage.setItem(
            'user',
            JSON.stringify({
              id: user.userId,
              email: user.email,
              firstName: user.firstName,
              lastName: user.lastName,
              userType: 'ADMIN',
              adminRole: user.role,
            }),
          );
        }
        api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
        setLoginTime();
      }
      toast.success('Welcome! You can sign in to the admin console.');
      navigate('/admin', { replace: true });
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Could not complete onboarding';
      toast.error(typeof msg === 'string' ? msg : 'Could not complete onboarding');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
        <h1 className="text-xl font-bold text-gray-900">Set your admin password</h1>
        <p className="mt-2 text-sm text-gray-600">
          Complete onboarding to activate your platform administrator account.
        </p>
        {!token && (
          <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            This link is missing a token. Ask your super admin to resend the invitation.
          </p>
        )}
        <form onSubmit={(e) => void submit(e)} className="mt-6 space-y-4">
          <div>
            <label
              htmlFor="invite-password"
              className="block text-xs font-semibold uppercase tracking-wider text-gray-500"
            >
              Password
            </label>
            <input
              id="invite-password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              required
              minLength={8}
            />
          </div>
          <div>
            <label
              htmlFor="invite-confirm"
              className="block text-xs font-semibold uppercase tracking-wider text-gray-500"
            >
              Confirm password
            </label>
            <input
              id="invite-confirm"
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              required
              minLength={8}
            />
          </div>
          <p className="text-xs text-gray-500">{PASSWORD_HINT}</p>
          <button
            type="submit"
            disabled={loading || !token}
            className="w-full rounded-lg bg-brand-500 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-600 disabled:opacity-50"
          >
            {loading ? 'Saving…' : 'Activate account'}
          </button>
        </form>
        <p className="mt-6 text-center text-sm text-gray-500">
          <Link to="/admin/login" className="text-brand-600 hover:text-brand-700">
            Back to admin login
          </Link>
        </p>
      </div>
    </div>
  );
}
