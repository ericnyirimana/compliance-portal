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
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">BNR Licensing Portal</h1>
          <p className="text-gray-500 text-sm mt-1">National Bank of Rwanda</p>
        </div>
        <form
          onSubmit={handleSubmit((d) => mutation.mutate(d))}
          className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 space-y-5"
        >
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email address
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              {...register('email', { required: 'Email is required' })}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              {...register('password', { required: 'Password is required' })}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
          </div>
          <button
            type="submit"
            disabled={mutation.isPending}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors"
          >
            {mutation.isPending ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
}
