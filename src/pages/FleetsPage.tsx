import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getFleets, createFleet, updateFleet, deleteFleet, getFleetVehicles, getFleetDrivers } from '../api';
import type { Fleet, CreateFleetRequest, UpdateFleetRequest } from '../types';

type ModalMode = 'create' | 'edit' | 'view' | null;

export default function FleetsPage() {
  const queryClient = useQueryClient();
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [selectedFleet, setSelectedFleet] = useState<Fleet | null>(null);
  const [formData, setFormData] = useState<CreateFleetRequest>({
    fleetName: '',
    ownerName: '',
    contactEmail: '',
    contactPhone: '',
    address: '',
  });

  // Fetch fleets
  const { data: fleets, isLoading } = useQuery({
    queryKey: ['fleets'],
    queryFn: getFleets,
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (data: CreateFleetRequest) => createFleet(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fleets'] });
      closeModal();
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateFleetRequest }) => updateFleet(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fleets'] });
      closeModal();
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteFleet(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fleets'] });
    },
  });

  const openCreateModal = () => {
    setFormData({
      fleetName: '',
      ownerName: '',
      contactEmail: '',
      contactPhone: '',
      address: '',
    });
    setSelectedFleet(null);
    setModalMode('create');
  };

  const openEditModal = (fleet: Fleet) => {
    setFormData({
      fleetName: fleet.fleetName,
      ownerName: fleet.ownerName || '',
      contactEmail: fleet.contactEmail || '',
      contactPhone: fleet.contactPhone || '',
      address: fleet.address || '',
    });
    setSelectedFleet(fleet);
    setModalMode('edit');
  };

  const openViewModal = (fleet: Fleet) => {
    setSelectedFleet(fleet);
    setModalMode('view');
  };

  const closeModal = () => {
    setModalMode(null);
    setSelectedFleet(null);
    setFormData({
      fleetName: '',
      ownerName: '',
      contactEmail: '',
      contactPhone: '',
      address: '',
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (modalMode === 'create') {
      createMutation.mutate(formData);
    } else if (modalMode === 'edit' && selectedFleet) {
      updateMutation.mutate({ id: selectedFleet.id, data: formData });
    }
  };

  const handleDelete = (fleet: Fleet) => {
    if (window.confirm(`Are you sure you want to delete the fleet "${fleet.fleetName}"? This action cannot be undone.`)) {
      deleteMutation.mutate(fleet.id);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'MWK' }).format(amount);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Fleet Management</h1>
          <p className="text-gray-600">Manage vehicle fleets and their drivers</p>
        </div>
        <button
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 px-4 py-2 bg-accent-600 text-white hover:bg-accent-700 font-medium text-sm"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Create Fleet
        </button>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex justify-center py-12">
          <div className="animate-spin h-8 w-8 border-b-2 border-accent-600"></div>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && fleets?.length === 0 && (
        <div className="text-center py-12 bg-white border border-gray-200">
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
              d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
            />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No fleets yet</h3>
          <p className="mt-1 text-sm text-gray-500">Get started by creating a new fleet.</p>
          <button
            onClick={openCreateModal}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-accent-600 text-white hover:bg-accent-700 font-medium text-sm"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Create Fleet
          </button>
        </div>
      )}

      {/* Fleets grid */}
      {fleets && fleets.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {fleets.map((fleet) => (
            <div
              key={fleet.id}
              className="bg-white border border-gray-200 p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{fleet.fleetName}</h3>
                  <p className="text-sm text-gray-500">Code: {fleet.fleetCode}</p>
                </div>
                <span
                  className={`px-2 py-1 rounded-full text-xs font-medium ${
                    fleet.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}
                >
                  {fleet.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>

              {fleet.ownerName && (
                <p className="text-sm text-gray-600 mb-2">
                  <span className="font-medium">Owner:</span> {fleet.ownerName}
                </p>
              )}

              <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-gray-100">
                <div>
                  <p className="text-2xl font-bold text-accent-600">{fleet.totalVehicles}</p>
                  <p className="text-xs text-gray-500">
                    Vehicles ({fleet.activeVehicles} active)
                  </p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-accent-600">{fleet.totalDrivers}</p>
                  <p className="text-xs text-gray-500">
                    Drivers ({fleet.activeDrivers} active)
                  </p>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-gray-100 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Total Earnings</span>
                  <span className="font-medium text-gray-900">
                    {formatCurrency(fleet.totalEarnings ?? 0)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Platform (10%)</span>
                  <span className="font-medium text-gray-900">
                    {formatCurrency((fleet.totalEarnings ?? 0) * 0.1)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Fleet/Drivers (90%)</span>
                  <span className="font-medium text-gray-900">
                    {formatCurrency((fleet.totalEarnings ?? 0) * 0.9)}
                  </span>
                </div>
              </div>

              <p className="text-xs text-gray-400 mt-4">Created {formatDate(fleet.createdAt)}</p>

              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => openViewModal(fleet)}
                  className="flex-1 px-3 py-2 border border-gray-300 text-gray-700 hover:bg-gray-50 text-sm font-medium"
                >
                  View
                </button>
                <button
                  onClick={() => openEditModal(fleet)}
                  className="flex-1 px-3 py-2 border border-accent-300 text-accent-700 hover:bg-accent-50 text-sm font-medium"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(fleet)}
                  disabled={deleteMutation.isPending}
                  className="px-3 py-2 border border-red-300 text-red-700 hover:bg-red-50 text-sm font-medium disabled:opacity-50"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      {(modalMode === 'create' || modalMode === 'edit') && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {modalMode === 'create' ? 'Create New Fleet' : 'Edit Fleet'}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Fleet Name *
                </label>
                <input
                  type="text"
                  value={formData.fleetName}
                  onChange={(e) => setFormData({ ...formData, fleetName: e.target.value })}
                  required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-accent-500 focus:border-accent-500"
                  placeholder="Enter fleet name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Owner Name
                </label>
                <input
                  type="text"
                  value={formData.ownerName}
                  onChange={(e) => setFormData({ ...formData, ownerName: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-accent-500 focus:border-accent-500"
                  placeholder="Enter owner name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Contact Email
                </label>
                <input
                  type="email"
                  value={formData.contactEmail}
                  onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-accent-500 focus:border-accent-500"
                  placeholder="contact@fleet.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Contact Phone
                </label>
                <input
                  type="tel"
                  value={formData.contactPhone}
                  onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-accent-500 focus:border-accent-500"
                  placeholder="+1 234 567 8900"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Address
                </label>
                <textarea
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  rows={2}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-accent-500 focus:border-accent-500"
                  placeholder="Fleet headquarters address"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="flex-1 px-4 py-2 bg-accent-600 text-white rounded-lg hover:bg-accent-700 disabled:opacity-50 font-medium text-sm"
                >
                  {createMutation.isPending || updateMutation.isPending
                    ? 'Saving...'
                    : modalMode === 'create'
                    ? 'Create Fleet'
                    : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Modal */}
      {modalMode === 'view' && selectedFleet && (
        <FleetDetailModal fleet={selectedFleet} onClose={closeModal} />
      )}
    </div>
  );
}

// Fleet Detail Modal Component
function FleetDetailModal({ fleet, onClose }: { fleet: Fleet; onClose: () => void }) {
  const [activeTab, setActiveTab] = useState<'vehicles' | 'drivers'>('vehicles');

  // Fetch fleet vehicles
  const { data: vehicles, isLoading: vehiclesLoading } = useQuery({
    queryKey: ['fleetVehicles', fleet.id],
    queryFn: () => getFleetVehicles(fleet.id),
  });

  // Fetch fleet drivers
  const { data: drivers, isLoading: driversLoading } = useQuery({
    queryKey: ['fleetDrivers', fleet.id],
    queryFn: () => getFleetDrivers(fleet.id),
  });

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-xl font-semibold text-gray-900">{fleet.fleetName}</h3>
              <p className="text-sm text-gray-500">Fleet Code: {fleet.fleetCode}</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Fleet info */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4">
            <div>
              <p className="text-2xl font-bold text-accent-600">{fleet.totalVehicles}</p>
              <p className="text-xs text-gray-500">Total Vehicles</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-green-600">{fleet.activeVehicles}</p>
              <p className="text-xs text-gray-500">Active Vehicles</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-accent-600">{fleet.totalDrivers}</p>
              <p className="text-xs text-gray-500">Total Drivers</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-green-600">{fleet.activeDrivers}</p>
              <p className="text-xs text-gray-500">Active Drivers</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 px-6">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('vehicles')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'vehicles'
                  ? 'border-accent-600 text-accent-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Vehicles ({fleet.totalVehicles})
            </button>
            <button
              onClick={() => setActiveTab('drivers')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'drivers'
                  ? 'border-accent-600 text-accent-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Drivers ({fleet.totalDrivers})
            </button>
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Vehicles Tab */}
          {activeTab === 'vehicles' && (
            <div>
              {vehiclesLoading && (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent-600"></div>
                </div>
              )}

              {!vehiclesLoading && vehicles?.length === 0 && (
                <p className="text-center text-gray-500 py-8">No vehicles in this fleet</p>
              )}

              {vehicles && vehicles.length > 0 && (
                <div className="space-y-3">
                  {vehicles.map((vehicle) => (
                    <div
                      key={vehicle.id}
                      className="bg-gray-50 rounded-lg p-4 flex items-center justify-between"
                    >
                      <div>
                        <p className="font-medium text-gray-900">
                          {vehicle.year} {vehicle.make} {vehicle.model}
                        </p>
                        <p className="text-sm text-gray-500">
                          {vehicle.licensePlate} • {vehicle.color} • {vehicle.vehicleType}
                        </p>
                        <p className="text-xs text-gray-400">Code: {vehicle.vehicleCode}</p>
                      </div>
                      <div className="text-right">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            vehicle.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {vehicle.isActive ? 'Active' : 'Inactive'}
                        </span>
                        {vehicle.driverName && (
                          <p className="text-sm text-gray-600 mt-1">{vehicle.driverName}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Drivers Tab */}
          {activeTab === 'drivers' && (
            <div>
              {driversLoading && (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent-600"></div>
                </div>
              )}

              {!driversLoading && drivers?.length === 0 && (
                <p className="text-center text-gray-500 py-8">No drivers in this fleet</p>
              )}

              {drivers && drivers.length > 0 && (
                <div className="space-y-3">
                  {drivers.map((driver) => (
                    <div
                      key={driver.id}
                      className="bg-gray-50 rounded-lg p-4 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        {driver.profilePictureUrl ? (
                          <img
                            src={driver.profilePictureUrl}
                            alt=""
                            className="w-10 h-10 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-accent-100 flex items-center justify-center text-accent-700 font-medium">
                            {driver.firstName?.[0]}{driver.lastName?.[0]}
                          </div>
                        )}
                        <div>
                          <p className="font-medium text-gray-900">
                            {driver.firstName} {driver.lastName}
                          </p>
                          <p className="text-sm text-gray-500">
                            {driver.phone || driver.email}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            driver.status === 'online'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {driver.status}
                        </span>
                        <p className="text-xs text-gray-400 mt-1">
                          Joined {formatDate(driver.createdAt)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium text-sm"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
