import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getVehicleRequests, reviewVehicleRequest } from '../api';
import type { DriverVehicleRequest, VehicleRequestStatus } from '../types';

type TabStatus = 'pending' | 'reviewed';

export default function VehicleApprovalsPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<TabStatus>('pending');
  const [selectedRequest, setSelectedRequest] = useState<DriverVehicleRequest | null>(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');

  // Fetch pending requests
  const { data: pendingRequests, isLoading: pendingLoading } = useQuery({
    queryKey: ['vehicleRequests', 'pending'],
    queryFn: () => getVehicleRequests('pending'),
  });

  // Fetch reviewed requests (approved + rejected)
  const { data: approvedRequests } = useQuery({
    queryKey: ['vehicleRequests', 'approved'],
    queryFn: () => getVehicleRequests('approved'),
  });

  const { data: rejectedRequests } = useQuery({
    queryKey: ['vehicleRequests', 'rejected'],
    queryFn: () => getVehicleRequests('rejected'),
  });

  const reviewedRequests = [...(approvedRequests || []), ...(rejectedRequests || [])].sort(
    (a, b) => new Date(b.reviewedAt || b.createdAt).getTime() - new Date(a.reviewedAt || a.createdAt).getTime()
  );

  // Approve mutation
  const approveMutation = useMutation({
    mutationFn: (id: string) => reviewVehicleRequest(id, { approved: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicleRequests'] });
      setSelectedRequest(null);
    },
  });

  // Reject mutation
  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      reviewVehicleRequest(id, { approved: false, rejectionReason: reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicleRequests'] });
      setSelectedRequest(null);
      setShowRejectModal(false);
      setRejectionReason('');
    },
  });

  const handleApprove = (request: DriverVehicleRequest) => {
    if (window.confirm(`Approve this ${request.requestType} request from ${request.driverName || 'driver'}?`)) {
      approveMutation.mutate(request.id);
    }
  };

  const handleReject = () => {
    if (selectedRequest && rejectionReason.trim()) {
      rejectMutation.mutate({ id: selectedRequest.id, reason: rejectionReason });
    }
  };

  const openRejectModal = (request: DriverVehicleRequest) => {
    setSelectedRequest(request);
    setShowRejectModal(true);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusBadge = (status: VehicleRequestStatus) => {
    const classes = {
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${classes[status]}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const getRequestTypeBadge = (type: string) => {
    const labels: Record<string, { label: string; color: string }> = {
      add: { label: 'Add Vehicle', color: 'bg-blue-100 text-blue-800' },
      update: { label: 'Update Vehicle', color: 'bg-purple-100 text-purple-800' },
      remove: { label: 'Remove Vehicle', color: 'bg-gray-100 text-gray-800' },
      link_fleet: { label: 'Link Fleet', color: 'bg-indigo-100 text-indigo-800' },
    };
    const config = labels[type] || { label: type, color: 'bg-gray-100 text-gray-800' };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
        {config.label}
      </span>
    );
  };

  const currentRequests = activeTab === 'pending' ? pendingRequests : reviewedRequests;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Vehicle Requests</h1>
        <p className="text-gray-600">Review and approve driver vehicle additions, updates, and removals</p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('pending')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'pending'
                ? 'border-accent-600 text-accent-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Pending
            {pendingRequests && pendingRequests.length > 0 && (
              <span className="ml-2 bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full text-xs">
                {pendingRequests.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('reviewed')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'reviewed'
                ? 'border-accent-600 text-accent-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Reviewed
          </button>
        </nav>
      </div>

      {/* Loading */}
      {pendingLoading && (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent-600"></div>
        </div>
      )}

      {/* Empty state */}
      {!pendingLoading && currentRequests?.length === 0 && (
        <div className="text-center py-12">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">
            {activeTab === 'pending' ? 'No pending requests' : 'No reviewed requests'}
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            {activeTab === 'pending'
              ? 'All vehicle requests have been processed.'
              : 'Vehicle requests you review will appear here.'}
          </p>
        </div>
      )}

      {/* Request cards */}
      {currentRequests && currentRequests.length > 0 && (
        <div className="grid gap-4">
          {currentRequests.map((request) => (
            <div
              key={request.id}
              className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                {/* Request info */}
                <div className="flex-1 space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    {getRequestTypeBadge(request.requestType)}
                    {getStatusBadge(request.status)}
                    {request.isFleetVehicle && (
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                        Fleet Vehicle
                      </span>
                    )}
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {request.driverName || 'Unknown Driver'}
                    </h3>
                    <p className="text-sm text-gray-600">
                      Submitted {formatDate(request.createdAt)}
                    </p>
                  </div>

                  {/* Vehicle details */}
                  {(request.make || request.vehicleCode) && (
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h4 className="text-sm font-medium text-gray-900 mb-2">Vehicle Details</h4>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        {request.vehicleCode && (
                          <div>
                            <span className="text-gray-500">Code:</span>{' '}
                            <span className="font-medium">{request.vehicleCode}</span>
                          </div>
                        )}
                        {request.make && (
                          <div>
                            <span className="text-gray-500">Make:</span>{' '}
                            <span className="font-medium">{request.make}</span>
                          </div>
                        )}
                        {request.model && (
                          <div>
                            <span className="text-gray-500">Model:</span>{' '}
                            <span className="font-medium">{request.model}</span>
                          </div>
                        )}
                        {request.year && (
                          <div>
                            <span className="text-gray-500">Year:</span>{' '}
                            <span className="font-medium">{request.year}</span>
                          </div>
                        )}
                        {request.color && (
                          <div>
                            <span className="text-gray-500">Color:</span>{' '}
                            <span className="font-medium">{request.color}</span>
                          </div>
                        )}
                        {request.licensePlate && (
                          <div>
                            <span className="text-gray-500">License:</span>{' '}
                            <span className="font-medium">{request.licensePlate}</span>
                          </div>
                        )}
                        {request.vehicleType && (
                          <div>
                            <span className="text-gray-500">Type:</span>{' '}
                            <span className="font-medium">{request.vehicleType}</span>
                          </div>
                        )}
                        {request.capacity && (
                          <div>
                            <span className="text-gray-500">Capacity:</span>{' '}
                            <span className="font-medium">{request.capacity} passengers</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Notes */}
                  {request.notes && (
                    <div className="text-sm">
                      <span className="text-gray-500">Notes:</span>{' '}
                      <span className="text-gray-700">{request.notes}</span>
                    </div>
                  )}

                  {/* Rejection reason */}
                  {request.status === 'rejected' && request.rejectionReason && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                      <p className="text-sm text-red-800">
                        <strong>Rejection reason:</strong> {request.rejectionReason}
                      </p>
                    </div>
                  )}

                  {/* Reviewed info */}
                  {request.reviewedAt && (
                    <p className="text-sm text-gray-500">
                      Reviewed {formatDate(request.reviewedAt)}
                      {request.reviewedByName && ` by ${request.reviewedByName}`}
                    </p>
                  )}
                </div>

                {/* Actions */}
                {request.status === 'pending' && (
                  <div className="flex gap-2 lg:flex-col">
                    <button
                      onClick={() => handleApprove(request)}
                      disabled={approveMutation.isPending}
                      className="flex-1 lg:flex-none px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 font-medium text-sm"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => openRejectModal(request)}
                      disabled={rejectMutation.isPending}
                      className="flex-1 lg:flex-none px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 font-medium text-sm"
                    >
                      Reject
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && selectedRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Reject Request</h3>
            <p className="text-sm text-gray-600 mb-4">
              Please provide a reason for rejecting this {selectedRequest.requestType} request from{' '}
              {selectedRequest.driverName || 'the driver'}.
            </p>
            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Enter rejection reason..."
              rows={4}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-accent-500 focus:border-accent-500"
            />
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectionReason('');
                  setSelectedRequest(null);
                }}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={!rejectionReason.trim() || rejectMutation.isPending}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 font-medium text-sm"
              >
                {rejectMutation.isPending ? 'Rejecting...' : 'Reject'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
