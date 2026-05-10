import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Eye, EyeOff, ArrowRight } from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { getApiErrorMessage } from '../lib/utils';

interface LoginForm { email: string; password: string }

export function LoginPage() {
  const { setTokens } = useAuth();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
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
    <div className="min-h-screen flex">
      {/* Left panel */}
      <div
        className="hidden lg:flex lg:w-5/12 xl:w-2/5 flex-col items-center justify-center p-10 text-center"
        style={{ backgroundColor: '#5C3B0E' }}
      >
        {/* Centre copy */}
        <div>
          <h1 className="text-white font-bold text-4xl leading-tight mb-4">
            Licensing &amp;<br />Compliance Portal
          </h1>
          <p className="text-white/65 text-base leading-relaxed">
            Streamlined licence applications and regulatory compliance
            for financial institutions supervised by the National Bank of Rwanda.
          </p>
        </div>

      </div>

      {/* Right panel */}
      <div className="flex-1 flex flex-col items-center justify-center bg-gray-50 p-6">
        {/* Logo — always visible on right panel */}
        <div className="mb-8 text-center">
          <img
            src="https://e-recruitment.bnr.rw/static/media/new_big_logo.7f159af4c1ebda18a7ffda2f2d952359.svg"
            alt="BNR logo"
            className="h-14 mx-auto"
          />
        </div>

        {/* Card */}
        <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Sign in</h2>
            <p className="text-gray-500 text-sm mt-1">Enter your email and password</p>
          </div>

          <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-5">
            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-gray-800 mb-1.5">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="admin@company.com"
                {...register('email', { required: 'Email is required' })}
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#5C3B0E]/30 focus:border-[#5C3B0E] font-mono transition-colors"
              />
              {errors.email && <p className="text-red-600 text-xs mt-1.5">{errors.email.message}</p>}
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-semibold text-gray-800 mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  {...register('password', { required: 'Password is required' })}
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 pr-11 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#5C3B0E]/30 focus:border-[#5C3B0E] transition-colors font-mono tracking-wider"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((p) => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && <p className="text-red-600 text-xs mt-1.5">{errors.password.message}</p>}
            </div>

            <button
              type="submit"
              disabled={mutation.isPending}
              className="w-full flex items-center justify-center gap-2 text-white rounded-lg px-4 py-3 text-sm font-semibold transition-opacity disabled:opacity-60 hover:opacity-90 mt-2"
              style={{ backgroundColor: '#5C3B0E' }}
            >
              {mutation.isPending ? 'Signing in…' : (
                <>Sign in <ArrowRight className="h-4 w-4" /></>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
