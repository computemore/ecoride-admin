import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { getDrivers, approveDriver, rejectDriver } from '../api';
import { useAuth } from '../context/AuthContext';

export default function PendingDriversPage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const isSuperAdmin = user?.adminRole === 'super_admin';
  const [rejectingDriverId, setRejectingDriverId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [error, setError] = useState('');

  const { data, isLoading, error: loadError } = useQuery({
    queryKey: ['pendingDrivers'],
    queryFn: () => getDrivers({ approvalStatus: 'pending_approval', pageSize: 50 }),
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const approveMutation = useMutation({
    mutationFn: approveDriver,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pendingDrivers'] });
      queryClient.invalidateQueries({ queryKey: ['adminStats'] });
      setError('');
    },
    onError: (err: Error) => setError(err.message),
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => rejectDriver(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pendingDrivers'] });
      queryClient.invalidateQueries({ queryKey: ['adminStats'] });
      setRejectingDriverId(null);
      setRejectReason('');
      setError('');
    },
    onError: (err: Error) => setError(err.message),
  });

  const handleReject = (driverId: string) => {
    if (!rejectReason.trim()) {
      setError('Please provide a reason for rejection');
      return;
    }
    rejectMutation.mutate({ id: driverId, reason: rejectReason });
  };

  if (loadError) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-600">Failed to load pending drivers</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-xl sm:text-xl md:text-2xl font-bold text-gray-900">Pending Driver Approvals</h1>
          <p className="text-sm sm:text-sm md:text-lg text-gray-500 mt-1">
            Review and approve or reject driver registrations
          </p>
        </div>
        {data && data.totalCount > 0 && (
          <span className="badge badge-yellow text-lg px-4 py-2">
            {data.totalCount} pending
          </span>
        )}
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      ) : data?.drivers.length === 0 ? (
        <div className="card text-center py-12">
          <svg className="mx-auto h-12 w-12 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3 className="mt-2 text-lg font-medium text-gray-900">All caught up!</h3>
          <p className="mt-1 text-gray-500">No pending driver approvals at this time.</p>
          <div className="mt-6">
            <Link to="/drivers" className="btn-secondary">
              View All Drivers
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {data?.drivers.map((driver) => (
            <div key={driver.id} className="card">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
                    {driver.profilePictureUrl ? (
                      <img
                        src={driver.profilePictureUrl}
                        alt=""
                        className="w-14 h-14 rounded-full object-cover"
                      />
                    ) : (
                      <span className="text-primary-700 font-medium text-lg">
                        {driver.fullName.split(' ').map(n => n[0]).join('')}
                      </span>
                    )}
                  </div>
                  <div>
                    <Link 
                      to={`/drivers/${driver.id}`}
                      className="text-lg font-semibold text-gray-900 hover:text-primary-600"
                    >
                      {driver.fullName}
                    </Link>
                    <div className="text-sm text-gray-500 mt-1">
                      <span>{driver.email}</span>
                      {driver.phone && <span className="ml-3">{driver.phone}</span>}
                    </div>
                    <div className="flex flex-wrap items-center gap-4 mt-3 text-sm">
                      <div>
                        <span className="text-gray-500">National ID:</span>{' '}
                        <span className="font-mono text-gray-900">{driver.nationalId || 'Not provided'}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">License:</span>{' '}
                        <span className="font-mono text-gray-900">{driver.licenseNumber}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Registered:</span>{' '}
                        <span className="text-gray-900 font-medium">{driver.registeredAtSast}</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Link
                    to={`/drivers/${driver.id}`}
                    className="btn-secondary text-sm"
                  >
                    View Details
                  </Link>
                  {isSuperAdmin ? (
                    <>
                      <button
                        onClick={() => {
                          if (confirm(`Approve ${driver.fullName}? They will be able to log in and accept rides.`)) {
                            approveMutation.mutate(driver.id);
                          }
                        }}
                        className="btn-primary text-sm"
                        disabled={approveMutation.isPending}
                      >
                        {approveMutation.isPending ? 'Approving...' : 'Approve'}
                      </button>
                      <button
                        onClick={() => setRejectingDriverId(driver.id)}
                        className="btn-danger text-sm"
                      >
                        Reject
                      </button>
                    </>
                  ) : (
                    <span className="text-xs text-gray-500">Super admin approval required</span>
                  )}
                </div>
              </div>

              {/* Reject Modal inline */}
              {rejectingDriverId === driver.id && (
                <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <h4 className="font-medium text-red-800 mb-2">Reject {driver.fullName}</h4>
                  <p className="text-sm text-red-600 mb-3">
                    Please provide a reason for rejecting this registration. This will be sent to the driver.
                  </p>
                  <textarea
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    className="input w-full h-24 resize-none mb-3"
                    placeholder="Enter rejection reason..."
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => {
                        setRejectingDriverId(null);
                        setRejectReason('');
                      }}
                      className="btn-secondary text-sm"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handleReject(driver.id)}
                      className="btn-danger text-sm"
                      disabled={rejectMutation.isPending || !rejectReason.trim()}
                    >
                      {rejectMutation.isPending ? 'Rejecting...' : 'Confirm Rejection'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
