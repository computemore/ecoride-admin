import axios from 'axios';
import type {
  AuthResponse,
  User,
  Driver,
  DriversListResponse,
  AdminStats,
  AdminChartsResponse,
  AdminPulse,
  AdminGrowthFinance,
  VehicleCatalogMake,
  VehicleCatalogModel,
  RegisterDriverRequest,
  UpdateDriverRequest,
  VehicleRequest,
  Vehicle,
  ListDriversQuery,
  PendingDriversResponse,
  DriverApprovalRequest,
  ChangeAdminPasswordRequest,
  UpdateAdminMeRequest,
  GrantAdminAccessRequest,
  GrantAdminAccessResponse,
  Promotion,
  CreatePromotionRequest,
  UpdatePromotionRequest,
  AdminPromoStats,
  // Fleet types
  Fleet,
  CreateFleetRequest,
  UpdateFleetRequest,
  FleetVehicle,
  // Vehicle request types
  DriverVehicleRequest,
  VehicleRequestApproval,
  // Corporate types
  Company,
  CreateCompanyRequest,
  UpdateCompanyRequest,
  CorporateUser,
  CsvImportResult,
  CorporateDashboardStats,
} from './types';

function stripTrailingSlash(url: string) {
  return url.endsWith('/') ? url.slice(0, -1) : url;
}

function resolveApiBase() {
  const configured = import.meta.env.VITE_API_URL;
  // For local development, fall back to production API
  if (!configured) return 'https://ecoride-4560.onrender.com/api';

  const base = stripTrailingSlash(configured);
  // If a full origin is provided without /api, add it.
  if (/^https?:\/\//i.test(base) && !/\/api$/i.test(base)) {
    return `${base}/api`;
  }
  return base;
}

const API_BASE = resolveApiBase();

// Create axios instance
const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

function tryGetFilenameFromContentDisposition(value: unknown): string | null {
  if (!value || typeof value !== 'string') return null;

  // Examples:
  // content-disposition: attachment; filename="growth-finance-30d-20251231.pdf"
  // content-disposition: attachment; filename=growth-finance-30d-20251231.pdf
  const match = /filename\*=UTF-8''([^;]+)|filename="([^"]+)"|filename=([^;]+)/i.exec(value);
  const candidate = decodeURIComponent(match?.[1] || match?.[2] || match?.[3] || '').trim();
  if (!candidate) return null;
  return candidate;
}

function triggerBrowserDownload(blob: Blob, filename: string) {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('admin_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 responses
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('admin_token');
      localStorage.removeItem('admin_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// =====================================================
// Auth API
// =====================================================

export async function login(email: string, password: string): Promise<AuthResponse> {
  const response = await api.post<AuthResponse>('/auth/login', { email, password });
  
  // Verify user is admin
  if (response.data.user.role !== 'admin') {
    throw new Error('Access denied. Admin privileges required.');
  }
  
  return response.data;
}

// =====================================================
// Admin API
// =====================================================

export async function getAdminMe(): Promise<User> {
  const response = await api.get<User>('/admin/me');
  return response.data;
}

export async function updateAdminMe(data: UpdateAdminMeRequest): Promise<User> {
  const response = await api.put<User>('/admin/me', data);
  return response.data;
}

export async function changeAdminPassword(data: ChangeAdminPasswordRequest): Promise<void> {
  await api.post('/admin/me/change-password', data);
}

export async function grantAdminAccess(data: GrantAdminAccessRequest): Promise<GrantAdminAccessResponse> {
  const response = await api.post<GrantAdminAccessResponse>('/admin/grant-access', data);
  return response.data;
}

export async function getStats(): Promise<AdminStats> {
  const response = await api.get<AdminStats>('/admin/stats');
  return response.data;
}

export async function getCharts(days = 14): Promise<AdminChartsResponse> {
  const response = await api.get<AdminChartsResponse>(`/admin/stats/charts?days=${days}`);
  return response.data;
}

export async function getPulse(): Promise<AdminPulse> {
  const response = await api.get<AdminPulse>('/admin/stats/pulse');
  return response.data;
}

export async function getGrowthFinance(days = 30): Promise<AdminGrowthFinance> {
  const response = await api.get<AdminGrowthFinance>(`/admin/stats/growth?days=${days}`);
  return response.data;
}

export async function getVehicleCatalogMakes(): Promise<VehicleCatalogMake[]> {
  const response = await api.get<VehicleCatalogMake[]>('/admin/vehicle-catalog/makes');
  return response.data;
}

export async function getVehicleCatalogModels(makeId: string): Promise<VehicleCatalogModel[]> {
  const response = await api.get<VehicleCatalogModel[]>(`/admin/vehicle-catalog/makes/${encodeURIComponent(makeId)}`);
  return response.data;
}

export async function downloadGrowthFinancePdf(days = 30): Promise<void> {
  const response = await api.get(`/admin/reports/growth-finance/pdf?days=${days}`, {
    responseType: 'blob',
  });

  const filename =
    tryGetFilenameFromContentDisposition(response.headers?.['content-disposition']) ||
    `growth-finance-${days}d.pdf`;

  triggerBrowserDownload(response.data as Blob, filename);
}

export async function downloadGrowthFinanceXlsx(days = 30): Promise<void> {
  const response = await api.get(`/admin/reports/growth-finance/xlsx?days=${days}`, {
    responseType: 'blob',
  });

  const filename =
    tryGetFilenameFromContentDisposition(response.headers?.['content-disposition']) ||
    `growth-finance-${days}d.xlsx`;

  triggerBrowserDownload(response.data as Blob, filename);
}

export async function getDrivers(query: ListDriversQuery = {}): Promise<DriversListResponse> {
  const params = new URLSearchParams();
  if (query.page) params.append('page', query.page.toString());
  if (query.pageSize) params.append('pageSize', query.pageSize.toString());
  if (query.search) params.append('search', query.search);
  if (query.status) params.append('status', query.status);
  if (query.approvalStatus) params.append('approvalStatus', query.approvalStatus);
  if (query.isActive !== undefined) params.append('isActive', query.isActive.toString());
  if (query.sortBy) params.append('sortBy', query.sortBy);
  if (query.sortOrder) params.append('sortOrder', query.sortOrder);

  const response = await api.get<DriversListResponse>(`/admin/drivers?${params.toString()}`);
  return response.data;
}

export async function getDriver(id: string): Promise<Driver> {
  const response = await api.get<Driver>(`/admin/drivers/${id}`);
  return response.data;
}

export async function downloadDriverReportPdf(driverId: string, fallbackName?: string): Promise<void> {
  const response = await api.get(`/admin/drivers/${driverId}/report`, {
    responseType: 'blob',
  });

  const safeName = (fallbackName || 'driver').trim().replace(/\s+/g, '-').replace(/[^a-z0-9\-_.]/gi, '');
  const filename =
    tryGetFilenameFromContentDisposition(response.headers?.['content-disposition']) ||
    `driver-report-${safeName}.pdf`;

  triggerBrowserDownload(response.data as Blob, filename);
}

export async function registerDriver(data: RegisterDriverRequest): Promise<Driver> {
  const response = await api.post<Driver>('/admin/drivers', data);
  return response.data;
}

export async function updateDriver(id: string, data: UpdateDriverRequest): Promise<Driver> {
  const response = await api.put<Driver>(`/admin/drivers/${id}`, data);
  return response.data;
}

export async function deactivateDriver(id: string): Promise<void> {
  await api.delete(`/admin/drivers/${id}`);
}

export async function activateDriver(id: string): Promise<void> {
  await api.post(`/admin/drivers/${id}/activate`);
}

// =====================================================
// Driver Approval API
// =====================================================

export async function getPendingDrivers(): Promise<PendingDriversResponse> {
  const response = await api.get<PendingDriversResponse>('/admin/drivers/pending');
  return response.data;
}

export async function approveDriver(id: string): Promise<Driver> {
  // Backend requires registration fee capture before approval.
  // Capture is idempotent, so it's safe to call even if already captured.
  await api.post<Driver>(`/admin/drivers/${id}/registration-fee/capture`, {});
  const response = await api.post<Driver>(`/admin/drivers/${id}/approval`, {
    approved: true,
  } satisfies DriverApprovalRequest);
  return response.data;
}

export async function rejectDriver(id: string, rejectionReason: string, notes?: string): Promise<Driver> {
  const response = await api.post<Driver>(`/admin/drivers/${id}/approval`, {
    approved: false,
    rejectionReason,
    notes,
  } satisfies DriverApprovalRequest);
  return response.data;
}

// =====================================================
// Vehicle API
// =====================================================

export async function addVehicle(driverId: string, data: VehicleRequest): Promise<Vehicle> {
  const response = await api.post<Vehicle>(`/admin/drivers/${driverId}/vehicles`, data);
  return response.data;
}

export async function updateVehicle(vehicleId: string, data: VehicleRequest): Promise<Vehicle> {
  const response = await api.put<Vehicle>(`/admin/vehicles/${vehicleId}`, data);
  return response.data;
}

export async function deactivateVehicle(vehicleId: string): Promise<void> {
  await api.delete(`/admin/vehicles/${vehicleId}`);
}

export type LiveRideStatus =
  | 'requested'
  | 'matching'
  | 'accepted'
  | 'en_route'
  | 'arrived'
  | 'in_progress'
  | 'completed'
  | 'cancelled';

export type AdminLiveRide = {
  id: string;
  riderName: string;
  driverName: string | null;
  status: LiveRideStatus | string;
  etaMinutes: number | null;
  requestedAt: string;
  originLatitude: number;
  originLongitude: number;
};

export type AdminLiveRidesResponse = {
  rides: AdminLiveRide[];
};

export async function getLiveRides({ limit = 50 }: { limit?: number }): Promise<AdminLiveRidesResponse> {
  const response = await api.get<AdminLiveRidesResponse>(`/admin/rides/live?limit=${limit}`);
  return response.data;
}

export async function adminCancelRide(
  rideId: string,
  body?: { reason?: string }
): Promise<{ success: boolean }> {
  const response = await api.post<{ success: boolean }>(`/admin/rides/${rideId}/cancel`, body ?? {});
  return response.data;
}

export async function adminReassignRide(rideId: string): Promise<{ success: boolean }> {
  const response = await api.post<{ success: boolean }>(`/admin/rides/${rideId}/reassign`, {});
  return response.data;
}

// =====================================================
// Promotions API
// =====================================================

export async function getPromotions(includeInactive = true): Promise<Promotion[]> {
  const response = await api.get<Promotion[]>(`/promotions/admin/all?includeInactive=${includeInactive}`);
  return response.data;
}

export async function getPromotion(id: string): Promise<Promotion> {
  const response = await api.get<Promotion>(`/promotions/admin/${id}`);
  return response.data;
}

export async function createPromotion(data: CreatePromotionRequest): Promise<Promotion> {
  const response = await api.post<Promotion>('/promotions/admin/create', data);
  return response.data;
}

export async function updatePromotion(id: string, data: UpdatePromotionRequest): Promise<Promotion> {
  const response = await api.put<Promotion>(`/promotions/admin/${id}`, data);
  return response.data;
}

export async function deletePromotion(id: string): Promise<void> {
  await api.delete(`/promotions/admin/${id}`);
}

export async function getPromoStats(days = 30): Promise<AdminPromoStats> {
  const response = await api.get<AdminPromoStats>(`/promotions/admin/stats?days=${days}`);
  return response.data;
}

// =====================================================
// Fleet API
// =====================================================

export async function getFleets(): Promise<Fleet[]> {
  const response = await api.get<any>('/fleets', {
    params: {
      page: 1,
      pageSize: 200,
      sortBy: 'fleet_name',
      sortOrder: 'asc',
    },
  });

  const data = response.data;
  if (Array.isArray(data)) return data as Fleet[];
  if (data && Array.isArray(data.fleets)) return data.fleets as Fleet[];
  return [];
}

export async function getFleet(id: string): Promise<Fleet> {
  const response = await api.get<Fleet>(`/fleets/${id}`);
  return response.data;
}

export async function createFleet(data: CreateFleetRequest): Promise<Fleet> {
  const response = await api.post<Fleet>('/fleets', data);
  return response.data;
}

export async function updateFleet(id: string, data: UpdateFleetRequest): Promise<Fleet> {
  const response = await api.put<Fleet>(`/fleets/${id}`, data);
  return response.data;
}

export async function deleteFleet(id: string): Promise<void> {
  await api.delete(`/fleets/${id}`);
}

export async function getFleetVehicles(fleetId: string): Promise<FleetVehicle[]> {
  const response = await api.get<FleetVehicle[]>(`/fleets/${fleetId}/vehicles`);
  return response.data;
}

export async function getFleetDrivers(fleetId: string): Promise<Driver[]> {
  const response = await api.get<Driver[]>(`/fleets/${fleetId}/drivers`);
  return response.data;
}

export async function assignFleetManager(fleetId: string, userId: string): Promise<void> {
  await api.post(`/fleets/${fleetId}/managers`, { userId });
}

export async function removeFleetManager(fleetId: string, userId: string): Promise<void> {
  await api.delete(`/fleets/${fleetId}/managers/${userId}`);
}

// =====================================================
// Vehicle Requests API (Driver submissions for approval)
// =====================================================

type VehicleRequestsListResponse = {
  requests: Array<{
    id: string;
    driverId: string;
    driverName: string;
    requestType: string;
    status: string;
    vehicleId?: string | null;
    fleetId?: string | null;
    fleetName?: string | null;
    vehicleCode?: string | null;
    isFleetVehicle: boolean;
    make?: string | null;
    model?: string | null;
    year?: number | null;
    color?: string | null;
    licensePlate?: string | null;
    vehicleType?: string | null;
    capacity?: number | null;
    notes?: string | null;
    rejectionReason?: string | null;
    reviewerName?: string | null;
    reviewedAt?: string | null;
    createdAt: string;
    updatedAt: string;
  }>;
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

function mapVehicleRequestToUi(request: VehicleRequestsListResponse['requests'][number]): DriverVehicleRequest {
  return {
    id: request.id,
    driverId: request.driverId,
    driverName: request.driverName,
    requestType: request.requestType as DriverVehicleRequest['requestType'],
    status: request.status as DriverVehicleRequest['status'],
    vehicleId: request.vehicleId ?? undefined,
    fleetId: request.fleetId ?? undefined,
    vehicleCode: request.vehicleCode ?? undefined,
    isFleetVehicle: request.isFleetVehicle,
    make: request.make ?? undefined,
    model: request.model ?? undefined,
    year: request.year ?? undefined,
    color: request.color ?? undefined,
    licensePlate: request.licensePlate ?? undefined,
    vehicleType: request.vehicleType ?? undefined,
    capacity: request.capacity ?? undefined,
    notes: request.notes ?? undefined,
    rejectionReason: request.rejectionReason ?? undefined,
    createdAt: request.createdAt,
    reviewedAt: request.reviewedAt ?? undefined,
    reviewedByName: request.reviewerName ?? undefined,
  };
}

export async function getVehicleRequests(status?: 'pending' | 'approved' | 'rejected'): Promise<DriverVehicleRequest[]> {
  const response = await api.get<VehicleRequestsListResponse>('/VehicleRequests', {
    params: {
      status,
      page: 1,
      pageSize: 200,
      sortBy: 'created_at',
      sortOrder: 'desc',
    },
  });

  return response.data.requests.map(mapVehicleRequestToUi);
}

export async function getVehicleRequest(id: string): Promise<DriverVehicleRequest> {
  const response = await api.get<VehicleRequestsListResponse['requests'][number]>(`/VehicleRequests/${id}`);
  return mapVehicleRequestToUi(response.data);
}

export async function reviewVehicleRequest(id: string, data: VehicleRequestApproval): Promise<DriverVehicleRequest> {
  const response = await api.post<VehicleRequestsListResponse['requests'][number]>(`/VehicleRequests/${id}/review`, data);
  return mapVehicleRequestToUi(response.data);
}

// =====================================================
// Corporate API
// =====================================================

type BackendCorporateDashboardStats = {
  totalCompanies: number;
  totalEmployees: number;
  totalMatchedRiders: number;
  totalRides: number;
  totalSpend: number;
  topCompanies: Array<{
    companyId: string;
    companyName: string;
    totalRides: number;
    totalSpend: number;
  }>;
};

type BackendCompaniesListResponse = {
  companies: Array<{
    id: string;
    companyName: string;
    companyCode: string;
    contactEmail?: string | null;
    contactPhone?: string | null;
    billingAddress?: string | null;
    totalEmployees: number;
    totalActiveRiders: number;
    totalRides: number;
    totalSpend: number;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
  }>;
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

type BackendCorporateUsersListResponse = {
  users: Array<{
    id: string;
    companyId: string;
    companyName: string;
    userId?: string | null;
    employeeId?: string | null;
    phone: string;
    email?: string | null;
    firstName: string;
    lastName: string;
    department?: string | null;
    jobTitle?: string | null;
    isMatched: boolean;
    isActive: boolean;
    totalRides: number;
    totalSpend: number;
    createdAt: string;
    updatedAt: string;
  }>;
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

type BackendCsvImportResponse = {
  importId: string;
  companyId: string;
  fileName: string;
  totalRows: number;
  rowsCreated: number;
  rowsUpdated: number;
  rowsFailed: number;
  status: string;
  createdAt: string;
  completedAt?: string | null;
};

type BackendCsvImportHistoryResponse = {
  imports: BackendCsvImportResponse[];
  total: number;
};

export async function getCorporateStats(): Promise<CorporateDashboardStats> {
  const response = await api.get<BackendCorporateDashboardStats>('/corporate/dashboard');
  return {
    totalCompanies: response.data.totalCompanies,
    totalCorporateUsers: response.data.totalEmployees,
    linkedUsers: response.data.totalMatchedRiders,
    totalCorporateRides: response.data.totalRides,
    totalCorporateSpend: response.data.totalSpend,
    companiesByRides: response.data.topCompanies.map((company) => ({
      companyName: company.companyName,
      rides: company.totalRides,
      spend: company.totalSpend,
    })),
  };
}

export async function getCompanies(): Promise<Company[]> {
  const response = await api.get<BackendCompaniesListResponse>('/corporate/companies', {
    params: {
      page: 1,
      pageSize: 200,
      sortBy: 'company_name',
      sortOrder: 'asc',
    },
  });

  return response.data.companies.map((company) => ({
    id: company.id,
    companyName: company.companyName,
    companyCode: company.companyCode,
    contactEmail: company.contactEmail ?? undefined,
    contactPhone: company.contactPhone ?? undefined,
    billingAddress: company.billingAddress ?? undefined,
    totalEmployees: company.totalEmployees,
    activeEmployees: company.totalActiveRiders,
    totalRides: company.totalRides,
    totalSpend: company.totalSpend,
    isActive: company.isActive,
    createdAt: company.createdAt,
    updatedAt: company.updatedAt,
  }));
}

export async function getCompany(id: string): Promise<Company> {
  const response = await api.get<Company>(`/corporate/companies/${id}`);
  return response.data;
}

export async function createCompany(data: CreateCompanyRequest): Promise<Company> {
  const response = await api.post<Company>('/corporate/companies', data);
  return response.data;
}

export async function updateCompany(id: string, data: UpdateCompanyRequest): Promise<Company> {
  const response = await api.put<Company>(`/corporate/companies/${id}`, data);
  return response.data;
}

export async function deleteCompany(id: string): Promise<void> {
  await api.delete(`/corporate/companies/${id}`);
}

export async function getCompanyUsers(companyId: string): Promise<CorporateUser[]> {
  const response = await api.get<BackendCorporateUsersListResponse>(`/corporate/companies/${companyId}/users`, {
    params: {
      page: 1,
      pageSize: 500,
      sortBy: 'last_name',
      sortOrder: 'asc',
    },
  });

  return response.data.users.map((user) => ({
    id: user.id,
    companyId: user.companyId,
    companyName: user.companyName,
    userId: user.userId ?? undefined,
    employeeId: user.employeeId ?? undefined,
    phone: user.phone,
    email: user.email ?? undefined,
    firstName: user.firstName,
    lastName: user.lastName,
    department: user.department ?? undefined,
    isLinked: user.isMatched,
    isActive: user.isActive,
    totalRides: user.totalRides,
    totalSpend: user.totalSpend,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  }));
}

export async function uploadCorporateCsv(companyId: string, file: File): Promise<CsvImportResult> {
  const formData = new FormData();
  formData.append('file', file);
  
  const response = await api.post<BackendCsvImportResponse>(
    `/corporate/companies/${companyId}/import-csv`,
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }
  );
  return {
    id: response.data.importId,
    companyId: response.data.companyId,
    filename: response.data.fileName,
    totalRows: response.data.totalRows,
    successfulRows: response.data.rowsCreated + response.data.rowsUpdated,
    failedRows: response.data.rowsFailed,
    status: response.data.status as CsvImportResult['status'],
    createdAt: response.data.createdAt,
    completedAt: response.data.completedAt ?? undefined,
  };
}

export async function getCsvImportHistory(companyId: string): Promise<CsvImportResult[]> {
  const response = await api.get<BackendCsvImportHistoryResponse>(`/corporate/companies/${companyId}/imports`);
  return response.data.imports.map((imp) => ({
    id: imp.importId,
    companyId: imp.companyId,
    filename: imp.fileName,
    totalRows: imp.totalRows,
    successfulRows: imp.rowsCreated + imp.rowsUpdated,
    failedRows: imp.rowsFailed,
    status: imp.status as CsvImportResult['status'],
    createdAt: imp.createdAt,
    completedAt: imp.completedAt ?? undefined,
  }));
}

export async function downloadCsvTemplate(): Promise<void> {
  const csvHeader = 'phone,first_name,last_name,email,employee_id,department,job_title\n';
  const blob = new Blob([csvHeader], { type: 'text/csv;charset=utf-8' });
  triggerBrowserDownload(blob, 'corporate-users-template.csv');
}

export default api;
