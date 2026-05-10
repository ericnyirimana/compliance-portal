import { useForm } from 'react-hook-form';
import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { api } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { getApiErrorMessage } from '../lib/utils';

interface LoginForm { email: string; password: string }

export function LoginPage() {
  const { setTokens } = useAuth();
  const navigate = useNavigate();
  const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>();

  const mutation = useMutation({
    mutationFn: (data: LoginForm) => api.post('/auth/login', data).then((r) => r.data),
    onSuccess: (data) => {
      setTokens(data.accessToken, data.refreshToken);
      navigate('/dashboard');
    },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  });

  return (
    <div className="min-h-screen bg-bnr-cream flex flex-col items-center justify-center p-4">
      {/* BNR Header */}
      <div className="text-center mb-8">
        <div
          className="h-16 w-16 rounded-full mx-auto mb-4 flex items-center justify-center"
          style={{ backgroundColor: '#5C3B0E' }}
        >
          <span className="text-white text-lg font-black tracking-tight">BNR</span>
        </div>
        <p className="text-xs font-semibold text-bnr-subtle uppercase tracking-widest mb-1">
          National Bank of Rwanda
        </p>
        <h1 className="text-2xl font-bold text-bnr-text">Licensing &amp; Compliance Portal</h1>
        <p className="text-bnr-subtle text-sm mt-1">Banki Nkuru y'u Rwanda</p>
      </div>

      {/* Login card */}
      <form
        onSubmit={handleSubmit((d) => mutation.mutate(d))}
        className="w-full max-w-md bg-bnr-light rounded-2xl shadow-md border border-bnr-muted p-8 space-y-5"
      >
        <h2 className="text-base font-semibold text-bnr-text mb-1">Sign in to your account</h2>

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-bnr-text mb-1">
            Email address
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            {...register('email', { required: 'Email is required' })}
            className="w-full rounded-lg border border-bnr-muted bg-white px-3 py-2.5 text-sm text-bnr-text placeholder:text-bnr-subtle focus:outline-none focus:ring-2 focus:ring-bnr-dark/40 focus:border-bnr-brown"
          />
          {errors.email && <p className="text-red-600 text-xs mt-1">{errors.email.message}</p>}
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-bnr-text mb-1">
            Password
          </label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            {...register('password', { required: 'Password is required' })}
            className="w-full rounded-lg border border-bnr-muted bg-white px-3 py-2.5 text-sm text-bnr-text placeholder:text-bnr-subtle focus:outline-none focus:ring-2 focus:ring-bnr-dark/40 focus:border-bnr-brown"
          />
          {errors.password && <p className="text-red-600 text-xs mt-1">{errors.password.message}</p>}
        </div>

        <button
          type="submit"
          disabled={mutation.isPending}
          className="w-full text-white rounded-lg px-4 py-2.5 text-sm font-semibold transition-opacity disabled:opacity-60"
          style={{ backgroundColor: '#5C3B0E' }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#7B5218'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#5C3B0E'; }}
        >
          {mutation.isPending ? 'Signing in…' : 'Sign in'}
        </button>
      </form>

      <p className="text-bnr-subtle text-xs mt-6">
        © {new Date().getFullYear()} National Bank of Rwanda. All rights reserved.
      </p>
    </div>
  );
}
