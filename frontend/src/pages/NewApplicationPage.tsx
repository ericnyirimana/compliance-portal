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

const fieldClass =
  'w-full rounded-lg border border-bnr-muted bg-white px-3 py-2.5 text-sm text-bnr-text placeholder:text-bnr-subtle focus:outline-none focus:ring-2 focus:ring-bnr-dark/40 focus:border-bnr-brown';

const labelClass = 'block text-sm font-medium text-bnr-text mb-1';

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
      <div>
        <h1 className="text-xl font-bold text-bnr-text">New Licence Application</h1>
        <p className="text-bnr-subtle text-sm mt-0.5">Fill in the details below to submit your application to BNR.</p>
      </div>

      <form
        onSubmit={handleSubmit((d) => mutation.mutate(d))}
        className="bg-bnr-light rounded-xl border border-bnr-muted p-6 space-y-5"
      >
        <div>
          <label htmlFor="bankName" className={labelClass}>Bank / Institution Name</label>
          <input
            id="bankName"
            placeholder="e.g. Kigali Commercial Bank Ltd"
            {...register('bankName', { required: 'Bank name is required', minLength: { value: 3, message: 'Min 3 characters' } })}
            className={fieldClass}
          />
          {errors.bankName && <p className="text-red-600 text-xs mt-1">{errors.bankName.message}</p>}
        </div>

        <div>
          <label htmlFor="licenceType" className={labelClass}>Licence Type</label>
          <select
            id="licenceType"
            {...register('licenceType', { required: 'Licence type is required' })}
            className={fieldClass}
          >
            <option value="">Select type…</option>
            <option value="COMMERCIAL_BANK">Commercial Bank</option>
            <option value="MICROFINANCE">Microfinance</option>
            <option value="FOREX_BUREAU">Forex Bureau</option>
            <option value="PAYMENT_INSTITUTION">Payment Institution</option>
          </select>
          {errors.licenceType && <p className="text-red-600 text-xs mt-1">{errors.licenceType.message}</p>}
        </div>

        <div>
          <label htmlFor="capitalAmount" className={labelClass}>Capital Amount (RWF)</label>
          <input
            id="capitalAmount"
            type="number"
            min={1}
            placeholder="e.g. 5000000000"
            {...register('capitalAmount', {
              required: 'Capital amount is required',
              min: { value: 1, message: 'Must be positive' },
              valueAsNumber: true,
            })}
            className={fieldClass}
          />
          {errors.capitalAmount && <p className="text-red-600 text-xs mt-1">{errors.capitalAmount.message}</p>}
        </div>

        <div>
          <label htmlFor="address" className={labelClass}>Business Address <span className="text-bnr-subtle font-normal">(optional)</span></label>
          <input
            id="address"
            placeholder="e.g. KG 1 Ave, Kigali, Rwanda"
            {...register('address')}
            className={fieldClass}
          />
        </div>

        <div className="flex gap-3 pt-2 border-t border-bnr-muted">
          <button
            type="submit"
            disabled={mutation.isPending}
            className="text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition-opacity disabled:opacity-60 hover:opacity-90"
            style={{ backgroundColor: '#5C3B0E' }}
          >
            {mutation.isPending ? 'Creating…' : 'Submit Application'}
          </button>
          <button
            type="button"
            onClick={() => navigate('/applications')}
            className="text-bnr-subtle hover:text-bnr-text px-4 py-2 rounded-lg text-sm transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
