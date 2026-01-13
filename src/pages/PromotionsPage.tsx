import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getPromotions, createPromotion, updatePromotion, deletePromotion } from '../api';
import type { Promotion, CreatePromotionRequest, UpdatePromotionRequest, PromotionDiscountType } from '../types';

type ModalMode = 'closed' | 'create' | 'edit' | 'view';

interface PromotionFormData {
  code: string;
  title: string;
  description: string;
  discountType: PromotionDiscountType;
  discountValue: string;
  maxDiscount: string;
  minRideFare: string;
  maxUsesPerUser: string;
  totalMaxUses: string;
  icon: string;
  startsAt: string;
  expiresAt: string;
  applicableTiers: string;
  eligibleRideTypes: string;
  isReferralPromo: boolean;
}

const defaultFormData: PromotionFormData = {
  code: '',
  title: '',
  description: '',
  discountType: 'percentage',
  discountValue: '',
  maxDiscount: '',
  minRideFare: '',
  maxUsesPerUser: '',
  totalMaxUses: '',
  icon: '🎉',
  startsAt: new Date().toISOString().slice(0, 16),
  expiresAt: '',
  applicableTiers: 'all',
  eligibleRideTypes: 'all_normal',
  isReferralPromo: false,
};

function formatDate(dateStr: string | undefined): string {
  if (!dateStr) return 'No expiry';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatDateForInput(dateStr: string | undefined): string {
  if (!dateStr) return '';
  return new Date(dateStr).toISOString().slice(0, 16);
}

function getDiscountBadge(type: PromotionDiscountType, value: number): string {
  switch (type) {
    case 'percentage':
      return `${value}% OFF`;
    case 'fixed':
      return `K${value} OFF`;
    case 'upgrade':
      return 'FREE UPGRADE';
    default:
      return `${value}`;
  }
}

function getStatusBadge(promo: Promotion): { text: string; className: string } {
  const now = new Date();
  const startsAt = new Date(promo.startsAt);
  const expiresAt = promo.expiresAt ? new Date(promo.expiresAt) : null;

  if (!promo.isActive) {
    return { text: 'Inactive', className: 'bg-gray-100 text-gray-700' };
  }
  if (startsAt > now) {
    return { text: 'Scheduled', className: 'bg-blue-100 text-blue-700' };
  }
  if (expiresAt && expiresAt < now) {
    return { text: 'Expired', className: 'bg-red-100 text-red-700' };
  }
  if (promo.totalMaxUses && promo.usageCount >= promo.totalMaxUses) {
    return { text: 'Limit Reached', className: 'bg-yellow-100 text-yellow-700' };
  }
  return { text: 'Active', className: 'bg-green-100 text-green-700' };
}

export default function PromotionsPage() {
  const queryClient = useQueryClient();
  const [modalMode, setModalMode] = useState<ModalMode>('closed');
  const [selectedPromotion, setSelectedPromotion] = useState<Promotion | null>(null);
  const [formData, setFormData] = useState<PromotionFormData>(defaultFormData);
  const [includeInactive, setIncludeInactive] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);

  const { data: promotions = [], isLoading, error } = useQuery({
    queryKey: ['promotions', includeInactive],
    queryFn: () => getPromotions(includeInactive),
  });

  const createMutation = useMutation({
    mutationFn: createPromotion,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['promotions'] });
      closeModal();
    },
    onError: (err: Error) => {
      setFormError(err.message || 'Failed to create promotion');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdatePromotionRequest }) =>
      updatePromotion(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['promotions'] });
      closeModal();
    },
    onError: (err: Error) => {
      setFormError(err.message || 'Failed to update promotion');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deletePromotion,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['promotions'] });
    },
  });

  const closeModal = () => {
    setModalMode('closed');
    setSelectedPromotion(null);
    setFormData(defaultFormData);
    setFormError(null);
  };

  const openCreateModal = () => {
    setFormData(defaultFormData);
    setModalMode('create');
  };

  const openEditModal = (promo: Promotion) => {
    setSelectedPromotion(promo);
    setFormData({
      code: promo.code,
      title: promo.title,
      description: promo.description,
      discountType: promo.discountType,
      discountValue: promo.discountValue.toString(),
      maxDiscount: promo.maxDiscount?.toString() || '',
      minRideFare: promo.minRideFare?.toString() || '',
      maxUsesPerUser: promo.maxUsesPerUser?.toString() || '',
      totalMaxUses: promo.totalMaxUses?.toString() || '',
      icon: promo.icon || '🎉',
      startsAt: formatDateForInput(promo.startsAt),
      expiresAt: formatDateForInput(promo.expiresAt),
      applicableTiers: promo.applicableTiers,
      eligibleRideTypes: promo.eligibleRideTypes || 'all_normal',
      isReferralPromo: promo.isReferralPromo,
    });
    setModalMode('edit');
  };

  const openViewModal = (promo: Promotion) => {
    setSelectedPromotion(promo);
    setModalMode('view');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formData.code.trim() || !formData.title.trim()) {
      setFormError('Code and Title are required');
      return;
    }

    const discountValue = parseFloat(formData.discountValue);
    if (isNaN(discountValue) || discountValue <= 0) {
      setFormError('Discount value must be a positive number');
      return;
    }

    if (modalMode === 'create') {
      const request: CreatePromotionRequest = {
        code: formData.code.toUpperCase().trim(),
        title: formData.title.trim(),
        description: formData.description.trim(),
        discountType: formData.discountType,
        discountValue,
        maxDiscount: formData.maxDiscount ? parseFloat(formData.maxDiscount) : undefined,
        minRideFare: formData.minRideFare ? parseFloat(formData.minRideFare) : undefined,
        maxUsesPerUser: formData.maxUsesPerUser ? parseInt(formData.maxUsesPerUser, 10) : undefined,
        totalMaxUses: formData.totalMaxUses ? parseInt(formData.totalMaxUses, 10) : undefined,
        icon: formData.icon || undefined,
        startsAt: formData.startsAt ? new Date(formData.startsAt).toISOString() : undefined,
        expiresAt: formData.expiresAt ? new Date(formData.expiresAt).toISOString() : undefined,
        applicableTiers: formData.applicableTiers,
        eligibleRideTypes: formData.eligibleRideTypes,
        isReferralPromo: formData.isReferralPromo,
      };
      createMutation.mutate(request);
    } else if (modalMode === 'edit' && selectedPromotion) {
      const request: UpdatePromotionRequest = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        discountValue,
        maxDiscount: formData.maxDiscount ? parseFloat(formData.maxDiscount) : undefined,
        minRideFare: formData.minRideFare ? parseFloat(formData.minRideFare) : undefined,
        maxUsesPerUser: formData.maxUsesPerUser ? parseInt(formData.maxUsesPerUser, 10) : undefined,
        totalMaxUses: formData.totalMaxUses ? parseInt(formData.totalMaxUses, 10) : undefined,
        icon: formData.icon || undefined,
        startsAt: formData.startsAt ? new Date(formData.startsAt).toISOString() : undefined,
        expiresAt: formData.expiresAt ? new Date(formData.expiresAt).toISOString() : undefined,
        applicableTiers: formData.applicableTiers,
        eligibleRideTypes: formData.eligibleRideTypes,
      };
      updateMutation.mutate({ id: selectedPromotion.id, data: request });
    }
  };

  const handleToggleActive = async (promo: Promotion) => {
    await updatePromotion(promo.id, { isActive: !promo.isActive });
    queryClient.invalidateQueries({ queryKey: ['promotions'] });
  };

  const handleDelete = async (promo: Promotion) => {
    if (window.confirm(`Are you sure you want to deactivate the promotion "${promo.title}"?`)) {
      deleteMutation.mutate(promo.id);
    }
  };

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-600">Failed to load promotions</p>
      </div>
    );
  }

  const activeCount = promotions.filter((p) => p.isActive).length;
  const expiredCount = promotions.filter((p) => p.expiresAt && new Date(p.expiresAt) < new Date()).length;
  const totalUsage = promotions.reduce((sum, p) => sum + p.usageCount, 0);

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-8">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Promotions & Discounts</h1>
          <p className="text-sm sm:text-base text-gray-500 mt-1">
            Manage promotional codes and discount programs
          </p>
        </div>
        <button onClick={openCreateModal} className="btn-green flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Create Promotion
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="card">
          <div className="text-sm font-medium text-gray-500">Total Promotions</div>
          <div className="mt-1 text-2xl font-bold text-gray-900">{promotions.length}</div>
        </div>
        <div className="card">
          <div className="text-sm font-medium text-gray-500">Active Promotions</div>
          <div className="mt-1 text-2xl font-bold text-green-600">{activeCount}</div>
        </div>
        <div className="card">
          <div className="text-sm font-medium text-gray-500">Expired</div>
          <div className="mt-1 text-2xl font-bold text-red-600">{expiredCount}</div>
        </div>
        <div className="card">
          <div className="text-sm font-medium text-gray-500">Total Uses</div>
          <div className="mt-1 text-2xl font-bold text-blue-600">{totalUsage}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 mb-6">
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={includeInactive}
            onChange={(e) => setIncludeInactive(e.target.checked)}
            className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
          />
          Show inactive promotions
        </label>
      </div>

      {/* Promotions Table */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      ) : promotions.length === 0 ? (
        <div className="card text-center py-12">
          <div className="text-4xl mb-4">🎉</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No promotions yet</h3>
          <p className="text-gray-500 mb-4">Create your first promotional code to get started</p>
          <button onClick={openCreateModal} className="btn-green">
            Create Promotion
          </button>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Promotion
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Code
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Discount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Usage
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Valid Until
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {promotions.map((promo) => {
                  const status = getStatusBadge(promo);
                  return (
                    <tr key={promo.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <span className="text-2xl mr-3">{promo.icon || '🎉'}</span>
                          <div>
                            <div className="font-medium text-gray-900">{promo.title}</div>
                            <div className="text-sm text-gray-500 max-w-xs truncate">
                              {promo.description}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <code className="px-2 py-1 bg-gray-100 rounded text-sm font-mono">
                          {promo.code}
                        </code>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-800">
                          {getDiscountBadge(promo.discountType, promo.discountValue)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {promo.usageCount}
                        {promo.totalMaxUses && (
                          <span className="text-gray-500">/{promo.totalMaxUses}</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${status.className}`}
                        >
                          {status.text}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(promo.expiresAt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openViewModal(promo)}
                            className="text-gray-600 hover:text-gray-900"
                            title="View details"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => openEditModal(promo)}
                            className="text-primary-600 hover:text-primary-900"
                            title="Edit"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleToggleActive(promo)}
                            className={promo.isActive ? 'text-yellow-600 hover:text-yellow-900' : 'text-green-600 hover:text-green-900'}
                            title={promo.isActive ? 'Deactivate' : 'Activate'}
                          >
                            {promo.isActive ? (
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                              </svg>
                            ) : (
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            )}
                          </button>
                          <button
                            onClick={() => handleDelete(promo)}
                            className="text-red-600 hover:text-red-900"
                            title="Delete"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal */}
      {modalMode !== 'closed' && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75" onClick={closeModal}></div>
            <div className="relative bg-white rounded-xl shadow-xl w-full max-w-2xl p-6">
              {/* Modal Header */}
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">
                  {modalMode === 'create' && 'Create New Promotion'}
                  {modalMode === 'edit' && 'Edit Promotion'}
                  {modalMode === 'view' && 'Promotion Details'}
                </h3>
                <button
                  onClick={closeModal}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* View Mode */}
              {modalMode === 'view' && selectedPromotion && (
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <span className="text-4xl">{selectedPromotion.icon || '🎉'}</span>
                    <div>
                      <h4 className="text-xl font-semibold text-gray-900">{selectedPromotion.title}</h4>
                      <code className="text-sm bg-gray-100 px-2 py-1 rounded">{selectedPromotion.code}</code>
                    </div>
                    <span className={`ml-auto px-3 py-1 rounded-full text-sm font-medium ${getStatusBadge(selectedPromotion).className}`}>
                      {getStatusBadge(selectedPromotion).text}
                    </span>
                  </div>
                  <p className="text-gray-600">{selectedPromotion.description}</p>
                  <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                    <div>
                      <div className="text-sm text-gray-500">Discount</div>
                      <div className="font-medium">{getDiscountBadge(selectedPromotion.discountType, selectedPromotion.discountValue)}</div>
                    </div>
                    {selectedPromotion.maxDiscount && (
                      <div>
                        <div className="text-sm text-gray-500">Max Discount</div>
                        <div className="font-medium">K{selectedPromotion.maxDiscount}</div>
                      </div>
                    )}
                    {selectedPromotion.minRideFare && (
                      <div>
                        <div className="text-sm text-gray-500">Min Ride Fare</div>
                        <div className="font-medium">K{selectedPromotion.minRideFare}</div>
                      </div>
                    )}
                    <div>
                      <div className="text-sm text-gray-500">Usage Count</div>
                      <div className="font-medium">
                        {selectedPromotion.usageCount}
                        {selectedPromotion.totalMaxUses && ` / ${selectedPromotion.totalMaxUses}`}
                      </div>
                    </div>
                    {selectedPromotion.maxUsesPerUser && (
                      <div>
                        <div className="text-sm text-gray-500">Uses Per User</div>
                        <div className="font-medium">{selectedPromotion.maxUsesPerUser}</div>
                      </div>
                    )}
                    <div>
                      <div className="text-sm text-gray-500">Starts At</div>
                      <div className="font-medium">{formatDate(selectedPromotion.startsAt)}</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-500">Expires At</div>
                      <div className="font-medium">{formatDate(selectedPromotion.expiresAt)}</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-500">Applicable Tiers</div>
                      <div className="font-medium capitalize">{selectedPromotion.applicableTiers.replace('_', ' ')}</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-500">Eligible Ride Types</div>
                      <div className="font-medium capitalize">{(selectedPromotion.eligibleRideTypes || 'all_normal').replace(/_/g, ' ')}</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-500">Referral Promo</div>
                      <div className="font-medium">{selectedPromotion.isReferralPromo ? 'Yes' : 'No'}</div>
                    </div>
                  </div>
                  <div className="flex justify-end gap-3 pt-4 border-t">
                    <button onClick={closeModal} className="btn-secondary">
                      Close
                    </button>
                    <button onClick={() => openEditModal(selectedPromotion)} className="btn-green">
                      Edit Promotion
                    </button>
                  </div>
                </div>
              )}

              {/* Create/Edit Form */}
              {(modalMode === 'create' || modalMode === 'edit') && (
                <form onSubmit={handleSubmit} className="space-y-6">
                  {formError && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-600 text-sm">
                      {formError}
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    {/* Code - only editable on create */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Promo Code <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.code}
                        onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                        disabled={modalMode === 'edit'}
                        className="w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 disabled:bg-gray-100 uppercase"
                        placeholder="SAVE20"
                        maxLength={20}
                      />
                    </div>

                    {/* Icon */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Icon
                      </label>
                      <input
                        type="text"
                        value={formData.icon}
                        onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                        className="w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                        placeholder="🎉"
                        maxLength={4}
                      />
                    </div>
                  </div>

                  {/* Title */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Title <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      className="w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                      placeholder="First Ride Discount"
                    />
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      rows={2}
                      className="w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                      placeholder="Get a discount on your first ride!"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    {/* Discount Type */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Discount Type <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={formData.discountType}
                        onChange={(e) => setFormData({ ...formData, discountType: e.target.value as PromotionDiscountType })}
                        className="w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                      >
                        <option value="percentage">Percentage (%)</option>
                        <option value="fixed">Fixed Amount (K)</option>
                        <option value="upgrade">Free Upgrade</option>
                      </select>
                    </div>

                    {/* Discount Value */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Discount Value <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        value={formData.discountValue}
                        onChange={(e) => setFormData({ ...formData, discountValue: e.target.value })}
                        className="w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                        placeholder={formData.discountType === 'percentage' ? '20' : '500'}
                        min="0"
                        step="0.01"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    {/* Max Discount */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Max Discount (K)
                      </label>
                      <input
                        type="number"
                        value={formData.maxDiscount}
                        onChange={(e) => setFormData({ ...formData, maxDiscount: e.target.value })}
                        className="w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                        placeholder="1000"
                        min="0"
                      />
                    </div>

                    {/* Min Ride Fare */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Min Ride Fare (K)
                      </label>
                      <input
                        type="number"
                        value={formData.minRideFare}
                        onChange={(e) => setFormData({ ...formData, minRideFare: e.target.value })}
                        className="w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                        placeholder="500"
                        min="0"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    {/* Max Uses Per User */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Uses Per User
                      </label>
                      <input
                        type="number"
                        value={formData.maxUsesPerUser}
                        onChange={(e) => setFormData({ ...formData, maxUsesPerUser: e.target.value })}
                        className="w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                        placeholder="1"
                        min="1"
                      />
                    </div>

                    {/* Total Max Uses */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Total Max Uses
                      </label>
                      <input
                        type="number"
                        value={formData.totalMaxUses}
                        onChange={(e) => setFormData({ ...formData, totalMaxUses: e.target.value })}
                        className="w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                        placeholder="1000"
                        min="1"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    {/* Starts At */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Starts At
                      </label>
                      <input
                        type="datetime-local"
                        value={formData.startsAt}
                        onChange={(e) => setFormData({ ...formData, startsAt: e.target.value })}
                        className="w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                      />
                    </div>

                    {/* Expires At */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Expires At
                      </label>
                      <input
                        type="datetime-local"
                        value={formData.expiresAt}
                        onChange={(e) => setFormData({ ...formData, expiresAt: e.target.value })}
                        className="w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                      />
                    </div>
                  </div>

                  {/* Applicable Tiers */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Applicable Tiers
                    </label>
                    <select
                      value={formData.applicableTiers}
                      onChange={(e) => setFormData({ ...formData, applicableTiers: e.target.value })}
                      className="w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                    >
                      <option value="all">All Tiers</option>
                      <option value="ecoride_fast">Ecoride Fast Only</option>
                      <option value="ecoride_luxury">Ecoride Luxury Only</option>
                    </select>
                  </div>

                  {/* Eligible Ride Types */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Eligible Ride Types
                    </label>
                    <select
                      value={formData.eligibleRideTypes}
                      onChange={(e) => setFormData({ ...formData, eligibleRideTypes: e.target.value })}
                      className="w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                    >
                      <option value="all_normal">All Normal (Fast &amp; Luxury)</option>
                      <option value="ecoride_fast">Fast Only</option>
                      <option value="ecoride_luxury">Luxury Only</option>
                      <option value="ecoride_corporate">Corporate Only</option>
                      <option value="all">All (including Corporate)</option>
                    </select>
                    <p className="text-xs text-gray-500 mt-1">
                      "All Normal" excludes corporate rides. Use "Corporate Only" for corporate-exclusive promos.
                    </p>
                  </div>

                  {/* Referral Promo - only on create */}
                  {modalMode === 'create' && (
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="isReferralPromo"
                        checked={formData.isReferralPromo}
                        onChange={(e) => setFormData({ ...formData, isReferralPromo: e.target.checked })}
                        className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                      <label htmlFor="isReferralPromo" className="text-sm text-gray-700">
                        This is a referral promotion (auto-granted to referred users)
                      </label>
                    </div>
                  )}

                  {/* Form Actions */}
                  <div className="flex justify-end gap-3 pt-4 border-t">
                    <button type="button" onClick={closeModal} className="btn-secondary">
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={createMutation.isPending || updateMutation.isPending}
                      className="btn-green"
                    >
                      {(createMutation.isPending || updateMutation.isPending) && (
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white inline" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                      )}
                      {modalMode === 'create' ? 'Create Promotion' : 'Save Changes'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
