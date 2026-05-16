'use client';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import { toast } from 'sonner';
import api from '@/lib/api';

const ROLES = [
  { value: 'MENTOR', label: 'Mentor', desc: 'Share expertise with startups', icon: '🎓' },
  { value: 'COMPANY_REP', label: 'Startup / Company', desc: 'Find mentors and join programmes', icon: '🚀' },
  { value: 'PARTNER', label: 'Partner / Investor', desc: 'Discover and support startups', icon: '🤝' },
  { value: 'SERVICE_PROVIDER', label: 'Service Provider', desc: 'Offer professional services', icon: '⚙️' },
];

const step2Schema = z.object({
  firstName: z.string().min(1, 'Required'),
  lastName: z.string().min(1, 'Required'),
  email: z.string().email('Invalid email'),
  password: z.string()
    .min(8, 'Min 8 characters')
    .regex(/[A-Z]/, 'Must contain uppercase')
    .regex(/[0-9]/, 'Must contain number')
    .regex(/[^A-Za-z0-9]/, 'Must contain special character'),
  confirmPassword: z.string(),
}).refine(d => d.password === d.confirmPassword, { message: 'Passwords do not match', path: ['confirmPassword'] });

export default function RegisterPage() {
  const [step, setStep] = useState(1);
  const [role, setRole] = useState('');
  const [done, setDone] = useState(false);

  const { register, handleSubmit, getValues, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(step2Schema),
  });

  const onSubmit = async (data: Record<string, unknown>) => {
    try {
      await api.post('/auth/register', { ...data, role });
      setDone(true);
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message || 'Registration failed';
      toast.error(message);
    }
  };

  if (done) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 w-full max-w-md text-center">
          <div className="text-5xl mb-4">📧</div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Check your email</h2>
          <p className="text-gray-500 dark:text-gray-400">We sent a verification link to <strong>{getValues('email')}</strong>. Click it to activate your account.</p>
          <Link href="/login" className="mt-6 inline-block text-blue-600 hover:underline">Back to login</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 w-full max-w-lg">
        <div className="text-center mb-6">
          <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center text-white font-bold text-xl mx-auto mb-3">E</div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Join EcoLink</h1>
          <div className="flex items-center justify-center gap-2 mt-3">
            {[1, 2].map(s => (
              <div key={s} className={`h-2 w-8 rounded-full transition-colors ${step >= s ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-600'}`} />
            ))}
          </div>
        </div>

        {step === 1 && (
          <div>
            <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-4 text-center">I am joining as a...</h2>
            <div className="grid grid-cols-2 gap-3 mb-6">
              {ROLES.map(r => (
                <button key={r.value} onClick={() => setRole(r.value)}
                  className={`p-4 rounded-xl border-2 text-left transition-all ${role === r.value ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-200 dark:border-gray-600 hover:border-blue-300'}`}>
                  <div className="text-2xl mb-2">{r.icon}</div>
                  <div className="font-semibold text-gray-900 dark:text-white text-sm">{r.label}</div>
                  <div className="text-gray-500 dark:text-gray-400 text-xs mt-1">{r.desc}</div>
                </button>
              ))}
            </div>
            <button onClick={() => role && setStep(2)} disabled={!role}
              className="w-full bg-blue-600 text-white rounded-lg px-4 py-3 font-semibold hover:bg-blue-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
              Continue
            </button>
          </div>
        )}

        {step === 2 && (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">First name</label>
                <input {...register('firstName')} placeholder="Ahmad"
                  className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2.5 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
                {errors.firstName && <p className="text-red-500 text-xs mt-1">{String(errors.firstName.message)}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Last name</label>
                <input {...register('lastName')} placeholder="Razali"
                  className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2.5 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
                {errors.lastName && <p className="text-red-500 text-xs mt-1">{String(errors.lastName.message)}</p>}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
              <input {...register('email')} type="email" placeholder="you@example.com"
                className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2.5 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
              {errors.email && <p className="text-red-500 text-xs mt-1">{String(errors.email.message)}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Password</label>
              <input {...register('password')} type="password" placeholder="••••••••"
                className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2.5 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
              {errors.password && <p className="text-red-500 text-xs mt-1">{String(errors.password.message)}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Confirm password</label>
              <input {...register('confirmPassword')} type="password" placeholder="••••••••"
                className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2.5 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
              {errors.confirmPassword && <p className="text-red-500 text-xs mt-1">{String(errors.confirmPassword.message)}</p>}
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={() => setStep(1)} className="flex-1 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg px-4 py-3 font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                Back
              </button>
              <button type="submit" disabled={isSubmitting} className="flex-1 bg-blue-600 text-white rounded-lg px-4 py-3 font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50">
                {isSubmitting ? 'Creating...' : 'Create Account'}
              </button>
            </div>
          </form>
        )}

        <p className="text-center text-sm text-gray-600 dark:text-gray-400 mt-4">
          Already have an account? <Link href="/login" className="text-blue-600 hover:underline font-medium">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
