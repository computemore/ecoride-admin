import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { changeAdminPassword, getAdminMe, updateAdminMe } from '../api';
import { useAuth } from '../context/AuthContext';

const PRIVACY_MASK_KEY = 'ecoride_admin_privacy_mask_my_details';

function maskEmail(email: string) {
  const atIndex = email.indexOf('@');
  if (atIndex <= 1) return '***';
  const local = email.slice(0, atIndex);
  const domain = email.slice(atIndex);
  return `${local[0]}***${local[local.length - 1]}${domain}`;
}

export default function AccountSettingsPage() {
  const navigate = useNavigate();
  const { user, updateUser, logout } = useAuth();

  const isSuperAdmin = user?.adminRole === 'super_admin';

  const [maskMyDetails, setMaskMyDetails] = useState(() => {
    return localStorage.getItem(PRIVACY_MASK_KEY) === 'true';
  });

  useEffect(() => {
    localStorage.setItem(PRIVACY_MASK_KEY, maskMyDetails ? 'true' : 'false');
  }, [maskMyDetails]);

  const { data: me } = useQuery({
    queryKey: ['adminMe'],
    queryFn: getAdminMe,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (me) updateUser(me);
  }, [me, updateUser]);

  const effectiveUser = me ?? user;

  const [firstName, setFirstName] = useState(effectiveUser?.firstName ?? '');
  const [lastName, setLastName] = useState(effectiveUser?.lastName ?? '');
  const [phone, setPhone] = useState(effectiveUser?.phone ?? '');
  const [profilePictureUrl, setProfilePictureUrl] = useState(effectiveUser?.profilePictureUrl ?? '');

  useEffect(() => {
    setFirstName(effectiveUser?.firstName ?? '');
    setLastName(effectiveUser?.lastName ?? '');
    setPhone(effectiveUser?.phone ?? '');
    setProfilePictureUrl(effectiveUser?.profilePictureUrl ?? '');
  }, [effectiveUser?.firstName, effectiveUser?.lastName, effectiveUser?.phone, effectiveUser?.profilePictureUrl]);

  const displayEmail = useMemo(() => {
    const email = effectiveUser?.email ?? '';
    if (!email) return '—';
    return maskMyDetails ? maskEmail(email) : email;
  }, [effectiveUser?.email, maskMyDetails]);

  const [savingProfile, setSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [profileSuccess, setProfileSuccess] = useState('');

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div>
      <div className="flex items-start justify-between gap-4 mb-8">
        <div>
          <h1 className="text-xl sm:text-xl md:text-2xl font-bold text-gray-900">Account Settings</h1>
          <p className="text-sm sm:text-sm md:text-base text-gray-500 mt-1">
            Manage your account, password, and privacy preferences.
          </p>
        </div>
        <button type="button" className="btn-secondary" onClick={() => navigate(-1)}>
          Back
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Account Details</h2>

          {(profileError || profileSuccess) && (
            <div
              className={`mb-4 p-3 rounded-lg border ${
                profileError ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'
              }`}
            >
              <p className={`text-sm ${profileError ? 'text-red-600' : 'text-green-700'}`}>{profileError || profileSuccess}</p>
            </div>
          )}

          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="account-first-name" className="block text-sm font-medium text-gray-700 mb-1">First name</label>
                <input id="account-first-name" className="input" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
              </div>
              <div>
                <label htmlFor="account-last-name" className="block text-sm font-medium text-gray-700 mb-1">Last name</label>
                <input id="account-last-name" className="input" value={lastName} onChange={(e) => setLastName(e.target.value)} />
              </div>
              <div className="md:col-span-2">
                <label htmlFor="account-email" className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input id="account-email" className="input" value={displayEmail} disabled />
              </div>
              <div>
                <label htmlFor="account-phone" className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <input id="account-phone" className="input" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Optional" />
              </div>
              <div>
                <label htmlFor="account-profile-picture" className="block text-sm font-medium text-gray-700 mb-1">Profile picture URL</label>
                <input
                  id="account-profile-picture"
                  className="input"
                  value={profilePictureUrl}
                  onChange={(e) => setProfilePictureUrl(e.target.value)}
                  placeholder="Optional"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                className="btn-primary"
                disabled={savingProfile}
                onClick={async () => {
                  setProfileError('');
                  setProfileSuccess('');
                  setSavingProfile(true);
                  try {
                    const updated = await updateAdminMe({
                      firstName: firstName.trim(),
                      lastName: lastName.trim(),
                      phone: phone.trim() || undefined,
                      profilePictureUrl: profilePictureUrl.trim() || undefined,
                    });
                    updateUser(updated);
                    setProfileSuccess('Saved.');
                  } catch (err: any) {
                    setProfileError(err?.message ?? 'Failed to update profile');
                  } finally {
                    setSavingProfile(false);
                  }
                }}
              >
                {savingProfile ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>

        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Change Password</h2>

          {(passwordError || passwordSuccess) && (
            <div
              className={`mb-4 p-3 rounded-lg border ${
                passwordError ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'
              }`}
            >
              <p className={`text-sm ${passwordError ? 'text-red-600' : 'text-green-700'}`}>{passwordError || passwordSuccess}</p>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label htmlFor="account-current-password" className="block text-sm font-medium text-gray-700 mb-1">Current password</label>
              <input
                id="account-current-password"
                type="password"
                autoComplete="current-password"
                className="input"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
              />
            </div>

            <div>
              <label htmlFor="account-new-password" className="block text-sm font-medium text-gray-700 mb-1">New password</label>
              <input
                id="account-new-password"
                type="password"
                autoComplete="new-password"
                className="input"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>

            <div>
              <label htmlFor="account-confirm-password" className="block text-sm font-medium text-gray-700 mb-1">Confirm new password</label>
              <input
                id="account-confirm-password"
                type="password"
                autoComplete="new-password"
                className="input"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                className="btn-primary"
                disabled={savingPassword}
                onClick={async () => {
                  setPasswordError('');
                  setPasswordSuccess('');

                  if (!newPassword || newPassword.length < 8) {
                    setPasswordError('New password must be at least 8 characters');
                    return;
                  }
                  if (newPassword !== confirmPassword) {
                    setPasswordError('New passwords do not match');
                    return;
                  }

                  setSavingPassword(true);
                  try {
                    await changeAdminPassword({ currentPassword, newPassword });
                    setCurrentPassword('');
                    setNewPassword('');
                    setConfirmPassword('');
                    setPasswordSuccess('Password updated.');
                  } catch (err: any) {
                    setPasswordError(err?.message ?? 'Failed to change password');
                  } finally {
                    setSavingPassword(false);
                  }
                }}
              >
                {savingPassword ? 'Updating...' : 'Update Password'}
              </button>
            </div>
          </div>
        </div>

        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Privacy Settings</h2>
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-sm font-medium text-gray-700">Mask my details on this device</div>
              <div className="text-xs text-gray-500 mt-1">Masks your email display in the admin portal UI.</div>
            </div>
            <button
              type="button"
              className={`px-3 py-2 rounded-xl border text-sm font-medium transition-colors ${
                maskMyDetails
                  ? 'bg-primary-600 text-white border-primary-600'
                  : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
              }`}
              onClick={() => setMaskMyDetails((v) => !v)}
            >
              {maskMyDetails ? 'On' : 'Off'}
            </button>
          </div>
        </div>

        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Admin Access</h2>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="text-sm text-gray-600">
              {isSuperAdmin
                ? 'Grant admin access to a user.'
                : 'Only super admins can grant admin access.'}
            </div>
            {isSuperAdmin && (
              <Link to="/grant-admin" className="btn-secondary">
                Grant Admin
              </Link>
            )}
          </div>
        </div>
      </div>

      <div className="mt-8 flex items-center justify-end">
        <button type="button" className="btn-secondary" onClick={handleLogout}>
          Logout
        </button>
      </div>
    </div>
  );
}
