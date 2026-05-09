import { useForm } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { api } from '../lib/api';
import { getApiErrorMessage } from '../lib/utils';

interface FormValues {
  bankName: string;
  licenceType: string;
  capitalAmount: number;
  address: string;
}

export function NewApplicationPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>();

  const mutation = useMutation({
    mutationFn: (data: FormValues) => api.post('/applications', data).then((r) => r.data),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['applications'] });
      toast.success('Application created');
      navigate(`/applications/${data.id}`);
    },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  });

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-xl font-semibold text-gray-900">New Application</h1>

      <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
        <div>
          <label htmlFor="bankName" className="block text-sm font-medium text-gray-700 mb-1">Bank / Institution Name</label>
          <input
            id="bankName"
            {...register('bankName', { required: 'Bank name is required', minLength: { value: 3, message: 'Min 3 characters' } })}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {errors.bankName && <p className="text-red-500 text-xs mt-1">{errors.bankName.message}</p>}
        </div>

        <div>
          <label htmlFor="licenceType" className="block text-sm font-medium text-gray-700 mb-1">Licence Type</label>
          <select
            id="licenceType"
            {...register('licenceType', { required: 'Licence type is required' })}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select type…</option>
            <option value="COMMERCIAL_BANK">Commercial Bank</option>
            <option value="MICROFINANCE">Microfinance</option>
            <option value="FOREX_BUREAU">Forex Bureau</option>
            <option value="PAYMENT_INSTITUTION">Payment Institution</option>
          </select>
          {errors.licenceType && <p className="text-red-500 text-xs mt-1">{errors.licenceType.message}</p>}
        </div>

        <div>
          <label htmlFor="capitalAmount" className="block text-sm font-medium text-gray-700 mb-1">Capital Amount (RWF)</label>
          <input
            id="capitalAmount"
            type="number"
            min={1}
            {...register('capitalAmount', { required: 'Capital amount is required', min: { value: 1, message: 'Must be positive' }, valueAsNumber: true })}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {errors.capitalAmount && <p className="text-red-500 text-xs mt-1">{errors.capitalAmount.message}</p>}
        </div>

        <div>
          <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1">Business Address (optional)</label>
          <input
            id="address"
            {...register('address')}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={mutation.isPending}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            {mutation.isPending ? 'Creating…' : 'Create Application'}
          </button>
          <button
            type="button"
            onClick={() => navigate('/applications')}
            className="text-gray-600 hover:text-gray-900 px-4 py-2 rounded-lg text-sm transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
