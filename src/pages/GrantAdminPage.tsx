import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { grantAdminAccess } from '../api';
import { useAuth } from '../context/AuthContext';
import type { GrantAdminAccessResponse } from '../types';

export default function GrantAdminPage() {
  const { user } = useAuth();
  const isSuperAdmin = user?.adminRole === 'super_admin';

  const [email, setEmail] = useState('');
  const [adminRole, setAdminRole] = useState<'admin' | 'super_admin'>('admin');
  const [firstName, setFirstName] = useState('Admin');
  const [lastName, setLastName] = useState('User');
  const [phone, setPhone] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<GrantAdminAccessResponse | null>(null);

  // const: reference to the computePassword function is immutable
  // cannot reassign but can mutate internal state
  const computePassword = () => {
    const initial = firstName.trim().charAt(0).toLocaleLowerCase();
    const surname = lastName.trim().toLocaleLowerCase().replace(/[^a-z0-9]/g, '');
    const digits = phone.replace(/\D/g, '');
    if (!surname) return null;
    if (digits.length < 4) return null;
    const last4 = digits.slice(-4);
    return `${initial}.${surname}-${last4}@ecoride`;
  };

  const passwordPreview = computePassword();

  if (!isSuperAdmin) {
    return <Navigate to="/" replace />;
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setResult(null);

    if (!email.trim()) {
      setError('Email is required');
      return;
    }

    if (!lastName.trim()) {
      setError('Last name is required');
      return;
    }

    if (!phone.trim()) {
      setError('Phone is required');
      return;
    }

    if (!passwordPreview) {
      setError('Phone must contain at least 4 digits (for password generation)');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await grantAdminAccess({
        email: email.trim(),
        adminRole,
        firstName: firstName.trim() || undefined,
        lastName: lastName.trim(),
        phone: phone.trim(),
      });
      setResult(response);
    } catch (err: any) {
      setError(err?.response?.data?.error ?? err?.message ?? 'Failed to grant admin access');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      <h1 className="text-xl sm:text-xl md:text-2xl font-bold text-gray-900">Grant Admin</h1>
      <p className="text-sm sm:text-sm md:text-lg text-gray-500 mt-1 mb-8">
        Grant and manage admin access for platform administration
      </p>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {result && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-sm text-green-700">
            {result.created ? 'Admin account created.' : 'Admin access granted.'} ({result.email})
          </p>
          {result.temporaryPassword && (
            <p className="mt-2 text-sm text-green-700">
              Temporary password: <span className="font-mono">{result.temporaryPassword}</span>
            </p>
          )}
        </div>
      )}

      <form onSubmit={onSubmit} className="card space-y-4 max-w-2xl">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm sm:text-sm md:text-base font-medium text-gray-700 mb-1">Email *</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input placeholder-sm"
              placeholder="admin@example.com"
            />
          </div>

          <div>
            <label className="block text-sm sm:text-sm md:text-base font-medium text-gray-700 mb-1">Admin Tier *</label>
            <select
              value={adminRole}
              onChange={(e) => setAdminRole(e.target.value as 'admin' | 'super_admin')}
              className="input placeholder-sm"
            >
              <option value="admin">admin</option>
              <option value="super_admin">super_admin</option>
            </select>
          </div>

          <div>
            <label className="block text-sm sm:text-sm md:text-base font-medium text-gray-700 mb-1">First Name *</label>
            <input
              type="text"
              required
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="input placeholder-sm"
            />
          </div>

          <div>
            <label className="block text-sm sm:text-sm md:text-base font-medium text-gray-700 mb-1">Last Name *</label>
            <input
              type="text"
              required
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="input placeholder-sm"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm sm:text-sm md:text-base font-medium text-gray-700 mb-1">Phone *</label>
            <input
              type="tel"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="input placeholder-sm"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm sm:text-sm md:text-base font-medium text-gray-700 mb-1">Initial Password</label>
            <input type="text" className="input placeholder-sm" value={passwordPreview ?? ''} readOnly />
            <p className="mt-1 text-xs text-gray-500">Pattern: initial.surname-last4phonedigits@ecoride</p>
          </div>
        </div>

        <div className="flex items-center justify-end">
          <button type="submit" className="btn-primary" disabled={isSubmitting}>
            {isSubmitting ? 'Granting…' : 'Grant Admin'}
          </button>
        </div>
      </form>
    </div>
  );
}
