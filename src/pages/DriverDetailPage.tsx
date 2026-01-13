import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { downloadDriverReportPdf, getDriver, updateDriver, deactivateDriver, activateDriver, addVehicle, deactivateVehicle, approveDriver, rejectDriver } from '../api';
import type { UpdateDriverRequest, VehicleRequest } from '../types';
import { useAuth } from '../context/AuthContext';

export default function DriverDetailPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const isSuperAdmin = user?.adminRole === 'super_admin';
  const [isEditing, setIsEditing] = useState(false);
  const [showAddVehicle, setShowAddVehicle] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [error, setError] = useState('');
  const [isDownloadingReport, setIsDownloadingReport] = useState(false);
  const [licensePreviewFailed, setLicensePreviewFailed] = useState(false);

  const { data: driver, isLoading, error: loadError } = useQuery({
    queryKey: ['driver', id],
    queryFn: () => getDriver(id!),
    enabled: !!id,
  });

  const [editForm, setEditForm] = useState<UpdateDriverRequest>({});

  const updateMutation = useMutation({
    mutationFn: (data: UpdateDriverRequest) => updateDriver(id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['driver', id] });
      setIsEditing(false);
      setError('');
    },
    onError: (err: Error) => setError(err.message),
  });

  const deactivateMutation = useMutation({
    mutationFn: () => deactivateDriver(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['driver', id] });
    },
  });

  const activateMutation = useMutation({
    mutationFn: () => activateDriver(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['driver', id] });
    },
  });

  const approveMutation = useMutation({
    mutationFn: () => approveDriver(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['driver', id] });
      queryClient.invalidateQueries({ queryKey: ['pendingDrivers'] });
      setError('');
    },
    onError: (err: Error) => setError(err.message),
  });

  const rejectMutation = useMutation({
    mutationFn: (reason: string) => rejectDriver(id!, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['driver', id] });
      queryClient.invalidateQueries({ queryKey: ['pendingDrivers'] });
      setShowRejectModal(false);
      setRejectReason('');
      setError('');
    },
    onError: (err: Error) => setError(err.message),
  });

  const handleReject = () => {
    if (!rejectReason.trim()) {
      setError('Please provide a reason for rejection');
      return;
    }
    rejectMutation.mutate(rejectReason);
  };

  const startEditing = () => {
    setEditForm({
      email: driver?.email,
      phone: driver?.phone || '',
      firstName: driver?.firstName,
      lastName: driver?.lastName,
      licenseNumber: driver?.licenseNumber,
      licenseExpiry: driver?.licenseExpiry ? new Date(driver.licenseExpiry).toISOString().split('T')[0] : '',
    });
    setIsEditing(true);
  };

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate(editForm);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (loadError || !driver) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold text-gray-900">Driver not found</h2>
        <Link to="/drivers" className="text-primary-600 hover:text-primary-800 mt-2 inline-block">
          ← Back to drivers
        </Link>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    const badges: Record<string, string> = {
      online: 'badge-green',
      offline: 'badge-gray',
      busy: 'badge-yellow',
      on_trip: 'badge-blue',
    };
    return badges[status] || 'badge-gray';
  };

  const getApprovalBadge = (status: string) => {
    const badges: Record<string, { class: string; label: string }> = {
      pending_approval: { class: 'badge-yellow', label: 'Pending Approval' },
      approved: { class: 'badge-green', label: 'Approved' },
      rejected: { class: 'badge-red', label: 'Rejected' },
      suspended: { class: 'badge-red', label: 'Suspended' },
    };
    return badges[status] || { class: 'badge-gray', label: status };
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Link to="/drivers" className="text-gray-400 hover:text-gray-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center">
              {driver.profilePictureUrl ? (
                <img src={driver.profilePictureUrl} alt="" className="w-16 h-16 rounded-full object-cover" />
              ) : (
                <span className="text-primary-700 font-bold text-xl">
                  {driver.firstName[0]}{driver.lastName[0]}
                </span>
              )}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{driver.fullName}</h1>
              <div className="flex items-center gap-2 mt-1">
                <span className={`badge ${getStatusBadge(driver.status)}`}>{driver.status}</span>
                <span className={`badge ${getApprovalBadge(driver.approvalStatus).class}`}>
                  {getApprovalBadge(driver.approvalStatus).label}
                </span>
                {!driver.isActive && <span className="badge badge-red">Inactive</span>}
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="btn-outline"
            disabled={!id || isDownloadingReport}
            onClick={async () => {
              if (!id) return;
              try {
                setIsDownloadingReport(true);
                await downloadDriverReportPdf(id, driver.fullName);
              } finally {
                setIsDownloadingReport(false);
              }
            }}
          >
            {isDownloadingReport ? 'Downloading…' : 'Download PDF'}
          </button>

          {/* Approval actions for pending drivers */}
          {driver.approvalStatus === 'pending_approval' && (
            <>
              {isSuperAdmin ? (
                <>
                  <button
                    onClick={() => {
                      if (confirm('Approve this driver? They will be able to log in and accept rides.')) {
                        approveMutation.mutate();
                      }
                    }}
                    className="btn-primary"
                    disabled={approveMutation.isPending}
                  >
                    {approveMutation.isPending ? 'Approving...' : 'Approve'}
                  </button>
                  <button
                    onClick={() => setShowRejectModal(true)}
                    className="btn-danger"
                    disabled={rejectMutation.isPending}
                  >
                    Reject
                  </button>
                </>
              ) : (
                <span className="text-xs text-gray-500">Super admin approval required</span>
              )}
            </>
          )}
          {driver.approvalStatus === 'approved' && !isEditing && (
            <button onClick={startEditing} className="btn-secondary">
              Edit
            </button>
          )}
          {driver.approvalStatus === 'approved' && driver.isActive && isSuperAdmin ? (
            <button
              onClick={() => {
                if (confirm('Are you sure you want to deactivate this driver?')) {
                  deactivateMutation.mutate();
                }
              }}
              className="btn-danger"
              disabled={deactivateMutation.isPending}
            >
              Deactivate
            </button>
          ) : driver.approvalStatus === 'approved' && !driver.isActive && isSuperAdmin ? (
            <button
              onClick={() => activateMutation.mutate()}
              className="btn-primary"
              disabled={activateMutation.isPending}
            >
              Activate
            </button>
          ) : null}
        </div>
      </div>

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Reject Driver Registration</h3>
            <p className="text-sm text-gray-600 mb-4">
              Please provide a reason for rejecting this driver's registration. This will be sent to the driver via email.
            </p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="input w-full h-32 resize-none"
              placeholder="Enter rejection reason..."
            />
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectReason('');
                }}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                className="btn-danger"
                disabled={rejectMutation.isPending || !rejectReason.trim()}
              >
                {rejectMutation.isPending ? 'Rejecting...' : 'Reject Driver'}
              </button>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Driver Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* Personal Info */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Personal Information</h2>
          {isEditing ? (
            <form onSubmit={handleUpdate} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                  <input
                    type="text"
                    value={editForm.firstName || ''}
                    onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })}
                    className="input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                  <input
                    type="text"
                    value={editForm.lastName || ''}
                    onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })}
                    className="input"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={editForm.email || ''}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  className="input"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <input
                  type="tel"
                  value={editForm.phone || ''}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  className="input"
                />
              </div>
              <div className="flex gap-2">
                <button type="submit" className="btn-primary" disabled={updateMutation.isPending}>
                  Save
                </button>
                <button type="button" onClick={() => setIsEditing(false)} className="btn-secondary">
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <dl className="space-y-3">
              <div>
                <dt className="text-sm text-gray-500">Email</dt>
                <dd className="text-gray-900">{driver.email}</dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">Phone</dt>
                <dd className="text-gray-900">{driver.phone || '-'}</dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">National ID / Passport</dt>
                <dd className="text-gray-900 font-mono">{driver.nationalId || '-'}</dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">KYC Status</dt>
                <dd>
                  <span className={`badge ${driver.kycStatus === 'verified' ? 'badge-green' : driver.kycStatus === 'rejected' ? 'badge-red' : 'badge-yellow'}`}>
                    {driver.kycStatus}
                  </span>
                </dd>
              </div>
            </dl>
          )}
        </div>

        {/* License Info */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">License Information</h2>
          {isEditing ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">License Number</label>
                <input
                  type="text"
                  value={editForm.licenseNumber || ''}
                  onChange={(e) => setEditForm({ ...editForm, licenseNumber: e.target.value })}
                  className="input"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">License Expiry</label>
                <input
                  type="date"
                  value={editForm.licenseExpiry || ''}
                  onChange={(e) => setEditForm({ ...editForm, licenseExpiry: e.target.value })}
                  className="input"
                />
              </div>
            </div>
          ) : (
            <dl className="space-y-3">
              <div>
                <dt className="text-sm text-gray-500">License Number</dt>
                <dd className="text-gray-900 font-mono">{driver.licenseNumber}</dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">License Expiry</dt>
                <dd className="text-gray-900">
                  {new Date(driver.licenseExpiry).toLocaleDateString()}
                  {new Date(driver.licenseExpiry) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) && (
                    <span className="badge badge-yellow ml-2">Expiring Soon</span>
                  )}
                </dd>
              </div>

              <div>
                <dt className="text-sm text-gray-500">License Document</dt>
                <dd className="text-gray-900">
                  {driver.licenseUrl ? (
                    <div className="space-y-2">
                      <a
                        href={driver.licenseUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-primary-600 hover:text-primary-800"
                      >
                        Open license
                      </a>

                      {!licensePreviewFailed && (
                        <img
                          src={driver.licenseUrl}
                          alt="Driver license"
                          className="w-full max-h-64 object-contain border border-gray-200 rounded-lg"
                          onError={() => setLicensePreviewFailed(true)}
                        />
                      )}

                      {licensePreviewFailed && (
                        <p className="text-xs text-gray-500">
                          Preview not available. Use the link above.
                        </p>
                      )}
                    </div>
                  ) : driver.hasLicenseOnFile ? (
                    <span className="text-gray-700">License on file</span>
                  ) : (
                    <span className="text-gray-500">No license uploaded</span>
                  )}
                </dd>
              </div>
            </dl>
          )}
        </div>

        {/* Stats */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Performance</h2>
          <dl className="space-y-3">
            <div className="flex items-center justify-between">
              <dt className="text-sm text-gray-500">Rating</dt>
              <dd className="flex items-center gap-1">
                <svg className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
                <span className="font-semibold">{driver.rating.toFixed(2)}</span>
              </dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-sm text-gray-500">Total Trips</dt>
              <dd className="font-semibold">{driver.totalTrips}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-sm text-gray-500">Total Earnings</dt>
              <dd className="font-semibold text-green-600">MWK {driver.totalEarnings.toLocaleString('en-US', { minimumFractionDigits: 2 })}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-sm text-gray-500">Cash Collected</dt>
              <dd className="font-semibold">MWK {(driver.actualEarnings ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-sm text-gray-500">
                {(driver.totalEarnings - (driver.actualEarnings ?? 0)) >= 0 ? 'Owed to Driver' : 'Driver Owes'}
              </dt>
              <dd className={`font-semibold ${(driver.totalEarnings - (driver.actualEarnings ?? 0)) >= 0 ? 'text-emerald-600' : 'text-orange-500'}`}>
                MWK {Math.abs(driver.totalEarnings - (driver.actualEarnings ?? 0)).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-sm text-gray-500">Kilometres Driven</dt>
              <dd className="font-semibold">{(driver.totalKilometres ?? 0).toFixed(1)} km</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-sm text-gray-500">Hours Driven</dt>
              <dd className="font-semibold">{(driver.totalHours ?? 0).toFixed(1)} hrs</dd>
            </div>
          </dl>
        </div>

        {/* Timestamps */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Account</h2>
          <dl className="space-y-3">
            <div>
              <dt className="text-sm text-gray-500">Registered (SAST)</dt>
              <dd className="text-gray-900 font-medium">{driver.registeredAtSast || new Date(driver.createdAt).toLocaleString()}</dd>
            </div>
            <div>
              <dt className="text-sm text-gray-500">Last Updated</dt>
              <dd className="text-gray-900">{new Date(driver.updatedAt).toLocaleString()}</dd>
            </div>
            {driver.approvalStatus === 'approved' && driver.approvedAt && (
              <div>
                <dt className="text-sm text-gray-500">Approved At</dt>
                <dd className="text-gray-900">{new Date(driver.approvedAt).toLocaleString()}</dd>
              </div>
            )}
            {driver.approvalStatus === 'rejected' && driver.rejectedAt && (
              <>
                <div>
                  <dt className="text-sm text-gray-500">Rejected At</dt>
                  <dd className="text-gray-900">{new Date(driver.rejectedAt).toLocaleString()}</dd>
                </div>
                <div>
                  <dt className="text-sm text-gray-500">Rejection Reason</dt>
                  <dd className="text-red-600">{driver.rejectionReason}</dd>
                </div>
              </>
            )}
          </dl>
        </div>
      </div>

      {/* Vehicles */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Vehicles</h2>
          <button onClick={() => setShowAddVehicle(true)} className="btn-secondary text-sm">
            + Add Vehicle
          </button>
        </div>

        {driver.vehicles.length > 0 ? (
          <div className="space-y-4">
            {driver.vehicles.map((vehicle) => (
              <VehicleCard
                key={vehicle.id}
                vehicle={vehicle}
                driverId={driver.id}
                onDeactivate={() => {
                  queryClient.invalidateQueries({ queryKey: ['driver', id] });
                }}
              />
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-sm">No vehicles registered</p>
        )}

        {showAddVehicle && (
          <AddVehicleModal
            driverId={driver.id}
            onClose={() => setShowAddVehicle(false)}
            onSuccess={() => {
              setShowAddVehicle(false);
              queryClient.invalidateQueries({ queryKey: ['driver', id] });
            }}
          />
        )}
      </div>
    </div>
  );
}

// Vehicle Card Component
function VehicleCard({ vehicle, onDeactivate }: { vehicle: any; driverId: string; onDeactivate: () => void }) {
  const deactivateMutation = useMutation({
    mutationFn: () => deactivateVehicle(vehicle.id),
    onSuccess: onDeactivate,
  });

  return (
    <div className={`p-4 rounded-lg border ${vehicle.isActive ? 'border-gray-200' : 'border-red-200 bg-red-50'}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
            <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
            </svg>
          </div>
          <div>
            <p className="font-medium text-gray-900">
              {vehicle.year} {vehicle.make} {vehicle.model}
            </p>
            <p className="text-sm text-gray-500">
              {vehicle.color} • {vehicle.licensePlate} • {vehicle.licensePlateColor} • {vehicle.vehicleType}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!vehicle.isActive && <span className="badge badge-red">Inactive</span>}
          {vehicle.isActive && (
            <button
              onClick={() => {
                if (confirm('Are you sure you want to deactivate this vehicle?')) {
                  deactivateMutation.mutate();
                }
              }}
              className="text-sm text-red-600 hover:text-red-800"
              disabled={deactivateMutation.isPending}
            >
              Deactivate
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// Add Vehicle Modal
function AddVehicleModal({ driverId, onClose, onSuccess }: { driverId: string; onClose: () => void; onSuccess: () => void }) {
  const [form, setForm] = useState<VehicleRequest>({
    make: '',
    model: '',
    year: new Date().getFullYear(),
    color: '',
    licensePlate: '',
    licensePlateColor: 'blackyellow',
    vehicleType: 'sedan',
    capacity: 4,
  });
  const [error, setError] = useState('');

  const mutation = useMutation({
    mutationFn: (data: VehicleRequest) => addVehicle(driverId, data),
    onSuccess,
    onError: (err: Error) => setError(err.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate(form);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full mx-4 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Add Vehicle</h3>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Make</label>
              <input
                type="text"
                required
                value={form.make}
                onChange={(e) => setForm({ ...form, make: e.target.value })}
                className="input"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Model</label>
              <input
                type="text"
                required
                value={form.model}
                onChange={(e) => setForm({ ...form, model: e.target.value })}
                className="input"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
              <input
                type="number"
                required
                value={form.year}
                onChange={(e) => setForm({ ...form, year: parseInt(e.target.value) })}
                className="input"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Color</label>
              <input
                type="text"
                required
                value={form.color}
                onChange={(e) => setForm({ ...form, color: e.target.value })}
                className="input"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">License Plate</label>
              <input
                type="text"
                required
                value={form.licensePlate}
                onChange={(e) => setForm({ ...form, licensePlate: e.target.value.toUpperCase() })}
                className="input"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">License Plate Color</label>
              <select
                required
                value={form.licensePlateColor}
                onChange={(e) => setForm({ ...form, licensePlateColor: e.target.value as any })}
                className="input"
              >
                <option value="blackyellow">Black / Yellow</option>
                <option value="redwhite">Red / White</option>
                <option value="blackwhite">Black / White</option>
                <option value="bluewhite">Blue / White</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
              <select
                value={form.vehicleType}
                onChange={(e) => setForm({ ...form, vehicleType: e.target.value as any })}
                className="input"
              >
                <option value="sedan">Sedan</option>
                <option value="suv">SUV</option>
                <option value="van">Van</option>
                <option value="luxury">Luxury</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={mutation.isPending}>
              {mutation.isPending ? 'Adding...' : 'Add Vehicle'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
