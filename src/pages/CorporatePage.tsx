import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getCorporateStats,
  getCompanies,
  createCompany,
  updateCompany,
  deleteCompany,
  getCompanyUsers,
  uploadCorporateCsv,
  downloadCsvTemplate,
  getCsvImportHistory,
} from '../api';
import type { Company, CreateCompanyRequest, UpdateCompanyRequest } from '../types';

type ModalMode = 'create' | 'edit' | 'view' | 'upload' | null;

export default function CorporatePage() {
  const queryClient = useQueryClient();
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [formData, setFormData] = useState<CreateCompanyRequest>({
    companyName: '',
    contactEmail: '',
    contactPhone: '',
    billingAddress: '',
    taxId: '',
  });

  // Fetch corporate stats
  const { data: stats } = useQuery({
    queryKey: ['corporateStats'],
    queryFn: getCorporateStats,
  });

  // Fetch companies
  const { data: companies, isLoading } = useQuery({
    queryKey: ['companies'],
    queryFn: getCompanies,
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (data: CreateCompanyRequest) => createCompany(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      queryClient.invalidateQueries({ queryKey: ['corporateStats'] });
      closeModal();
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateCompanyRequest }) => updateCompany(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      closeModal();
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteCompany(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      queryClient.invalidateQueries({ queryKey: ['corporateStats'] });
    },
  });

  const openCreateModal = () => {
    setFormData({
      companyName: '',
      contactEmail: '',
      contactPhone: '',
      billingAddress: '',
      taxId: '',
    });
    setSelectedCompany(null);
    setModalMode('create');
  };

  const openEditModal = (company: Company) => {
    setFormData({
      companyName: company.companyName,
      contactEmail: company.contactEmail || '',
      contactPhone: company.contactPhone || '',
      billingAddress: company.billingAddress || '',
      taxId: company.taxId || '',
    });
    setSelectedCompany(company);
    setModalMode('edit');
  };

  const openViewModal = (company: Company) => {
    setSelectedCompany(company);
    setModalMode('view');
  };

  const openUploadModal = (company: Company) => {
    setSelectedCompany(company);
    setModalMode('upload');
  };

  const closeModal = () => {
    setModalMode(null);
    setSelectedCompany(null);
    setFormData({
      companyName: '',
      contactEmail: '',
      contactPhone: '',
      billingAddress: '',
      taxId: '',
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (modalMode === 'create') {
      createMutation.mutate(formData);
    } else if (modalMode === 'edit' && selectedCompany) {
      updateMutation.mutate({ id: selectedCompany.id, data: formData });
    }
  };

  const handleDelete = (company: Company) => {
    if (window.confirm(`Are you sure you want to delete "${company.companyName}"? This will remove all corporate users associated with this company.`)) {
      deleteMutation.mutate(company.id);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'MWK' }).format(amount);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Corporate Program</h1>
          <p className="text-gray-600">Manage corporate clients and employee riders</p>
        </div>
        <button
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 px-4 py-2 bg-accent-600 text-white hover:bg-accent-700 font-medium text-sm"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Company
        </button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white border border-gray-200 p-4">
            <p className="text-3xl font-bold text-accent-600">{stats.totalCompanies}</p>
            <p className="text-sm text-gray-500">Companies</p>
          </div>
          <div className="bg-white border border-gray-200 p-4">
            <p className="text-3xl font-bold text-accent-600">{stats.totalCorporateUsers}</p>
            <p className="text-sm text-gray-500">Corporate Users</p>
          </div>
          <div className="bg-white border border-gray-200 p-4">
            <p className="text-3xl font-bold text-green-600">{stats.linkedUsers}</p>
            <p className="text-sm text-gray-500">Linked Accounts</p>
          </div>
          <div className="bg-white border border-gray-200 p-4">
            <p className="text-3xl font-bold text-accent-600">{formatCurrency(stats.totalCorporateSpend)}</p>
            <p className="text-sm text-gray-500">Total Spend</p>
          </div>
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent-600"></div>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && companies?.length === 0 && (
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
          <h3 className="mt-2 text-sm font-medium text-gray-900">No companies yet</h3>
          <p className="mt-1 text-sm text-gray-500">Get started by adding a corporate client.</p>
          <button
            onClick={openCreateModal}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-accent-600 text-white rounded-lg hover:bg-accent-700 font-medium text-sm"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Company
          </button>
        </div>
      )}

      {/* Companies list */}
      {companies && companies.length > 0 && (
        <div className="bg-white border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Company
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Code
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Employees
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Rides
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Spend
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {companies.map((company) => (
                  <tr key={company.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <p className="font-medium text-gray-900">{company.companyName}</p>
                        {company.contactEmail && (
                          <p className="text-sm text-gray-500">{company.contactEmail}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="font-mono text-sm text-gray-600">{company.companyCode}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-gray-900">{company.totalEmployees}</span>
                      <span className="text-gray-500 text-sm"> ({company.activeEmployees} active)</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-900">
                      {company.totalRides}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-900">
                      {formatCurrency(company.totalSpend)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          company.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {company.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openViewModal(company)}
                          className="p-2 text-gray-400 hover:text-gray-600"
                          title="View details"
                        >
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => openUploadModal(company)}
                          className="p-2 text-gray-400 hover:text-accent-600"
                          title="Upload CSV"
                        >
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                          </svg>
                        </button>
                        <button
                          onClick={() => openEditModal(company)}
                          className="p-2 text-gray-400 hover:text-accent-600"
                          title="Edit"
                        >
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDelete(company)}
                          className="p-2 text-gray-400 hover:text-red-600"
                          title="Delete"
                        >
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create/Edit Modal */}
      {(modalMode === 'create' || modalMode === 'edit') && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {modalMode === 'create' ? 'Add New Company' : 'Edit Company'}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Company Name *
                </label>
                <input
                  type="text"
                  value={formData.companyName}
                  onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                  required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-accent-500 focus:border-accent-500"
                  placeholder="Enter company name"
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
                  placeholder="hr@company.com"
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
                  Billing Address
                </label>
                <textarea
                  value={formData.billingAddress}
                  onChange={(e) => setFormData({ ...formData, billingAddress: e.target.value })}
                  rows={2}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-accent-500 focus:border-accent-500"
                  placeholder="Company billing address"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tax ID
                </label>
                <input
                  type="text"
                  value={formData.taxId}
                  onChange={(e) => setFormData({ ...formData, taxId: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-accent-500 focus:border-accent-500"
                  placeholder="Company tax ID"
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
                    ? 'Add Company'
                    : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Modal */}
      {modalMode === 'view' && selectedCompany && (
        <CompanyDetailModal company={selectedCompany} onClose={closeModal} />
      )}

      {/* Upload Modal */}
      {modalMode === 'upload' && selectedCompany && (
        <CsvUploadModal company={selectedCompany} onClose={closeModal} />
      )}
    </div>
  );
}

// Company Detail Modal
function CompanyDetailModal({ company, onClose }: { company: Company; onClose: () => void }) {
  // Fetch company users
  const { data: users, isLoading } = useQuery({
    queryKey: ['companyUsers', company.id],
    queryFn: () => getCompanyUsers(company.id),
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-xl font-semibold text-gray-900">{company.companyName}</h3>
              <p className="text-sm text-gray-500">Company Code: {company.companyCode}</p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
              <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Company stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4">
            <div>
              <p className="text-2xl font-bold text-accent-600">{company.totalEmployees}</p>
              <p className="text-xs text-gray-500">Total Employees</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-green-600">{company.activeEmployees}</p>
              <p className="text-xs text-gray-500">Active Employees</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-accent-600">{company.totalRides}</p>
              <p className="text-xs text-gray-500">Total Rides</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-accent-600">{formatCurrency(company.totalSpend)}</p>
              <p className="text-xs text-gray-500">Total Spend</p>
            </div>
          </div>
        </div>

        {/* Users list */}
        <div className="flex-1 overflow-y-auto p-6">
          <h4 className="font-medium text-gray-900 mb-4">Corporate Users</h4>

          {isLoading && (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent-600"></div>
            </div>
          )}

          {!isLoading && users?.length === 0 && (
            <p className="text-center text-gray-500 py-8">
              No users yet. Upload a CSV to add employees.
            </p>
          )}

          {users && users.length > 0 && (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Phone</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Department</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Linked</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Rides</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Spend</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {users.map((user) => (
                    <tr key={user.id}>
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium text-gray-900">
                            {user.firstName} {user.lastName}
                          </p>
                          {user.employeeId && (
                            <p className="text-xs text-gray-500">ID: {user.employeeId}</p>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{user.phone}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{user.department || '-'}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            user.isLinked ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {user.isLinked ? 'Yes' : 'No'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">{user.totalRides}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{formatCurrency(user.totalSpend)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
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

// CSV Upload Modal
function CsvUploadModal({ company, onClose }: { company: Company; onClose: () => void }) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);

  // Fetch import history
  const { data: imports } = useQuery({
    queryKey: ['csvImports', company.id],
    queryFn: () => getCsvImportHistory(company.id),
  });

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: (file: File) => uploadCorporateCsv(company.id, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['csvImports', company.id] });
      queryClient.invalidateQueries({ queryKey: ['companyUsers', company.id] });
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      queryClient.invalidateQueries({ queryKey: ['corporateStats'] });
      setSelectedFile(null);
    },
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.name.endsWith('.csv')) {
      setSelectedFile(file);
    }
  };

  const handleUpload = () => {
    if (selectedFile) {
      uploadMutation.mutate(selectedFile);
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      await downloadCsvTemplate();
    } catch (error) {
      console.error('Failed to download template:', error);
    }
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

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-xl font-semibold text-gray-900">Upload Employee CSV</h3>
              <p className="text-sm text-gray-500">{company.companyName}</p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
              <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Download template */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-blue-600 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="flex-1">
                <p className="text-sm text-blue-800">
                  Download the CSV template to see the required format. Include columns: phone, first_name, last_name, email, employee_id, department, job_title.
                </p>
                <button
                  onClick={handleDownloadTemplate}
                  className="mt-2 text-sm font-medium text-blue-600 hover:text-blue-800"
                >
                  Download Template →
                </button>
              </div>
            </div>
          </div>

          {/* Upload area */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
              dragOver
                ? 'border-accent-500 bg-accent-50'
                : 'border-gray-300 hover:border-accent-400 hover:bg-gray-50'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileSelect}
              className="hidden"
            />
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <p className="mt-2 text-sm text-gray-600">
              {selectedFile ? selectedFile.name : 'Click to select or drag and drop a CSV file'}
            </p>
          </div>

          {/* Selected file */}
          {selectedFile && (
            <div className="flex items-center justify-between bg-gray-50 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <svg className="w-8 h-8 text-accent-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <div>
                  <p className="font-medium text-gray-900">{selectedFile.name}</p>
                  <p className="text-sm text-gray-500">{(selectedFile.size / 1024).toFixed(1)} KB</p>
                </div>
              </div>
              <button
                onClick={handleUpload}
                disabled={uploadMutation.isPending}
                className="px-4 py-2 bg-accent-600 text-white rounded-lg hover:bg-accent-700 disabled:opacity-50 font-medium text-sm"
              >
                {uploadMutation.isPending ? 'Uploading...' : 'Upload'}
              </button>
            </div>
          )}

          {/* Upload result */}
          {uploadMutation.isSuccess && uploadMutation.data && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-sm text-green-800">
                ✓ Successfully processed {uploadMutation.data.successfulRows} of {uploadMutation.data.totalRows} rows
                {uploadMutation.data.failedRows > 0 && ` (${uploadMutation.data.failedRows} failed)`}
              </p>
            </div>
          )}

          {uploadMutation.isError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-800">
                Failed to upload CSV. Please check the format and try again.
              </p>
            </div>
          )}

          {/* Import history */}
          {imports && imports.length > 0 && (
            <div>
              <h4 className="font-medium text-gray-900 mb-3">Import History</h4>
              <div className="space-y-2">
                {imports.slice(0, 5).map((imp) => (
                  <div
                    key={imp.id}
                    className="flex items-center justify-between bg-gray-50 rounded-lg p-3 text-sm"
                  >
                    <div>
                      <p className="font-medium text-gray-900">{imp.filename}</p>
                      <p className="text-xs text-gray-500">{formatDate(imp.createdAt)}</p>
                    </div>
                    <div className="text-right">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          imp.status === 'completed'
                            ? 'bg-green-100 text-green-800'
                            : imp.status === 'failed'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}
                      >
                        {imp.status}
                      </span>
                      <p className="text-xs text-gray-500 mt-1">
                        {imp.successfulRows}/{imp.totalRows} rows
                      </p>
                    </div>
                  </div>
                ))}
              </div>
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
