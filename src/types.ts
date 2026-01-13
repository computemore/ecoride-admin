// =====================================================
// Admin Portal Types
// =====================================================

export interface User {
  id: string;
  email: string;
  phone?: string;
  firstName: string;
  lastName: string;
  profilePictureUrl?: string;
  role: 'rider' | 'driver' | 'admin';
  adminRole?: 'admin' | 'super_admin' | 'fleet_manager';
  fleetId?: string;
  isCorporate?: boolean;
  kycStatus: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
  user: User;
}

export interface UpdateAdminMeRequest {
  firstName: string;
  lastName: string;
  phone?: string;
  profilePictureUrl?: string;
}

export interface ChangeAdminPasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface GrantAdminAccessRequest {
  email: string;
  adminRole: 'admin' | 'super_admin' | 'fleet_manager';
  firstName?: string;
  lastName?: string;
  phone?: string;
  fleetId?: string; // Required for fleet_manager role
}

export interface GrantAdminAccessResponse {
  userId: string;
  email: string;
  role: 'admin';
  adminRole?: 'admin' | 'super_admin' | 'fleet_manager';
  created: boolean;
  temporaryPassword?: string;
}

export interface Driver {
  id: string;
  userId: string;
  email: string;
  phone?: string;
  firstName: string;
  lastName: string;
  fullName: string;
  profilePictureUrl?: string;
  kycStatus: string;
  isActive: boolean;
  licenseUrl?: string | null;
  hasLicenseOnFile?: boolean;
  licenseNumber: string;
  licenseExpiry: string;
  status: 'offline' | 'online' | 'busy' | 'on_trip';
  rating: number;
  totalTrips: number;
  totalEarnings: number;
  actualEarnings: number;
  createdAt: string;
  updatedAt: string;
  vehicles: Vehicle[];
  // New fields for approval workflow and statistics
  nationalId?: string;
  approvalStatus: 'pending_approval' | 'approved' | 'rejected' | 'suspended';
  approvedAt?: string;
  approvedBy?: string;
  rejectedAt?: string;
  rejectionReason?: string;
  registeredAtSast: string; // UTC+2 formatted timestamp
  totalKilometres: number;
  totalHours: number;

  registrationFeeAmountMwk?: number;
  registrationFeePaidAt?: string;
  registrationFeeStatus?: 'paid' | 'unpaid';
}

export interface DriverSummary {
  id: string;
  userId: string;
  email: string;
  phone?: string;
  fullName: string;
  profilePictureUrl?: string;
  licenseNumber: string;
  status: string;
  rating: number;
  totalTrips: number;
  isActive: boolean;
  vehicleCount: number;
  createdAt: string;
  // New fields
  nationalId?: string;
  approvalStatus: 'pending_approval' | 'approved' | 'rejected' | 'suspended';
  registeredAtSast: string;
  totalKilometres: number;
  totalHours: number;

  registrationFeeStatus?: 'paid' | 'unpaid';
}

export interface Vehicle {
  id: string;
  make: string;
  model: string;
  year: number;
  color: string;
  licensePlate: string;
  licensePlateColor: 'blackyellow' | 'redwhite' | 'blackwhite' | 'bluewhite';
  vehicleType: 'sedan' | 'suv' | 'van' | 'luxury' | 'compact' | 'truck' | 'other';
  capacity: number;
  isActive: boolean;
  createdAt: string;
}

export interface DriversListResponse {
  drivers: DriverSummary[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface AdminStats {
  totalDrivers: number;
  activeDrivers: number;
  onlineDrivers: number;
  onTripDrivers: number;
  totalVehicles: number;
  totalRidesToday: number;
  totalEarningsToday: number;
  pendingKycCount: number;
  expiringLicensesCount: number;
  pendingApprovalCount: number; // Drivers awaiting approval
  recentActivity: RecentActivity[];
}

export interface DailyMetricPoint {
  date: string; // YYYY-MM-DD
  value: number;
}

export interface CategoryMetricPoint {
  category: string;
  value: number;
}

export interface AdminChartsResponse {
  days: number;
  ridesPerDay: DailyMetricPoint[];
  earningsPerDay: DailyMetricPoint[];
  driversByApprovalStatus: CategoryMetricPoint[];
  driversByKycStatus: CategoryMetricPoint[];
  driversByRegistrationFeeStatus: CategoryMetricPoint[];
}

export interface AdminPulse {
  asOf: string;
  activeRidersToday: number;
  onlineDrivers: number;
  riderToDriverRatio: number | null;
  totalRidesRequestedToday: number;
  totalRidesCompletedToday: number;
  fulfillmentRateTodayPercent: number;
  averageWaitTimeMinutesToday: number | null;
  totalKilometresDrivenToday: number;
  totalKilometresDrivenAllTime: number;
  onlineHoursToday: number | null;
  onTripHoursToday: number;
}

export interface AdminGrowthFinance {
  days: number;
  windowStart: string;
  windowEnd: string;
  newRiders: number;
  ridersRequestedRide: number;
  ridersCompletedRide: number;
  arpuRiderMwk: number | null;
  arpuDriverMwk: number | null;
  riderChurnRatePercent: number | null;
  driverChurnRatePercent: number | null;
  cacMwk: number | null;
}

export interface RecentActivity {
  driverId: string;
  driverName: string;
  activityType: string;
  description: string;
  timestamp: string;
}

// Request types
export interface RegisterDriverRequest {
  email: string;
  phone?: string;
  password: string;
  firstName: string;
  lastName: string;
  nationalId: string; // National ID or passport number
  profilePictureUrl?: string;
  licenseNumber: string;
  licenseExpiry: string;
  registrationFeeAmountMwk?: number;
  registrationFeePaid?: boolean;
  registrationFeeNotes?: string;
  vehicle?: VehicleRequest;
}

export interface VehicleRequest {
  make: string;
  model: string;
  year: number;
  color: string;
  licensePlate: string;
  licensePlateColor: 'blackyellow' | 'redwhite' | 'blackwhite' | 'bluewhite';
  vehicleType: 'sedan' | 'suv' | 'van' | 'luxury' | 'compact' | 'truck' | 'other';
  capacity: number;
}

export interface VehicleCatalogMake {
  id: string;
  name: string;
}

export interface VehicleCatalogModel {
  model: string;
  vehicleType: string;
  capacity: number;
}

export interface UpdateDriverRequest {
  email?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  profilePictureUrl?: string;
  isActive?: boolean;
  licenseNumber?: string;
  licenseExpiry?: string;
  status?: string;
}

export interface ListDriversQuery {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: string;
  approvalStatus?: 'pending_approval' | 'approved' | 'rejected' | 'suspended';
  isActive?: boolean;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// Approval workflow types
export interface DriverApprovalRequest {
  approved: boolean;
  notes?: string;
  rejectionReason?: string;
}

export interface PendingDriversResponse {
  drivers: DriverSummary[];
  totalCount: number;
}

// =====================================================
// Promotions Types
// =====================================================

export type PromotionDiscountType = 'percentage' | 'fixed' | 'upgrade';

export interface Promotion {
  id: string;
  code: string;
  title: string;
  description: string;
  discountType: PromotionDiscountType;
  discountValue: number;
  maxDiscount?: number;
  minRideFare?: number;
  maxUsesPerUser?: number;
  totalMaxUses?: number;
  usageCount: number;
  icon?: string;
  startsAt: string;
  expiresAt?: string;
  isActive: boolean;
  isReferralPromo: boolean;
  eligibleRideTypes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePromotionRequest {
  code: string;
  title: string;
  description: string;
  discountType: PromotionDiscountType;
  discountValue: number;
  maxDiscount?: number;
  minRideFare?: number;
  maxUsesPerUser?: number;
  totalMaxUses?: number;
  icon?: string;
  startsAt?: string;
  expiresAt?: string;
  eligibleRideTypes?: string;
  isReferralPromo?: boolean;
}

export interface UpdatePromotionRequest {
  title?: string;
  description?: string;
  discountValue?: number;
  maxDiscount?: number;
  minRideFare?: number;
  maxUsesPerUser?: number;
  totalMaxUses?: number;
  icon?: string;
  startsAt?: string;
  expiresAt?: string;
  isActive?: boolean;
  eligibleRideTypes?: string;
}

// =====================================================
// Fleet Types
// =====================================================

export interface Fleet {
  id: string;
  fleetCode: string;
  fleetName: string;
  ownerName?: string;
  contactEmail?: string;
  contactPhone?: string;
  address?: string;
  totalVehicles: number;
  activeVehicles: number;
  totalDrivers: number;
  activeDrivers: number;
  isActive: boolean;
  totalTrips?: number;
  totalEarnings?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateFleetRequest {
  fleetName: string;
  ownerName?: string;
  contactEmail?: string;
  contactPhone?: string;
  address?: string;
}

export interface UpdateFleetRequest {
  fleetName?: string;
  ownerName?: string;
  contactEmail?: string;
  contactPhone?: string;
  address?: string;
  isActive?: boolean;
}

export interface FleetVehicle {
  id: string;
  vehicleCode: string;
  make: string;
  model: string;
  year: number;
  color: string;
  licensePlate: string;
  vehicleType: string;
  capacity: number;
  isActive: boolean;
  driverName?: string;
  createdAt: string;
}

// =====================================================
// Vehicle Request Types (Driver submissions for approval)
// =====================================================

export type VehicleRequestType = 'add' | 'update' | 'remove' | 'link_fleet';
export type VehicleRequestStatus = 'pending' | 'approved' | 'rejected';

export interface DriverVehicleRequest {
  id: string;
  driverId: string;
  driverName?: string;
  requestType: VehicleRequestType;
  status: VehicleRequestStatus;
  vehicleId?: string;
  fleetId?: string;
  vehicleCode?: string;
  isFleetVehicle: boolean;
  make?: string;
  model?: string;
  year?: number;
  color?: string;
  licensePlate?: string;
  vehicleType?: string;
  capacity?: number;
  notes?: string;
  rejectionReason?: string;
  createdAt: string;
  reviewedAt?: string;
  reviewedByName?: string;
}

export interface VehicleRequestApproval {
  approved: boolean;
  rejectionReason?: string;
}

// =====================================================
// Corporate Types
// =====================================================

export interface Company {
  id: string;
  companyName: string;
  companyCode: string;
  contactEmail?: string;
  contactPhone?: string;
  billingAddress?: string;
  taxId?: string;
  totalEmployees: number;
  activeEmployees: number;
  totalRides: number;
  totalSpend: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCompanyRequest {
  companyName: string;
  contactEmail?: string;
  contactPhone?: string;
  billingAddress?: string;
  taxId?: string;
}

export interface UpdateCompanyRequest {
  companyName?: string;
  contactEmail?: string;
  contactPhone?: string;
  billingAddress?: string;
  taxId?: string;
  isActive?: boolean;
}

export interface CorporateUser {
  id: string;
  companyId: string;
  companyName?: string;
  userId?: string;
  employeeId?: string;
  phone: string;
  email?: string;
  firstName: string;
  lastName: string;
  department?: string;
  costCenter?: string;
  monthlyRideLimit?: number;
  perRideLimit?: number;
  isLinked: boolean;
  isActive: boolean;
  totalRides: number;
  totalSpend: number;
  createdAt: string;
  updatedAt: string;
}

export interface CsvImportResult {
  id: string;
  companyId: string;
  filename: string;
  totalRows: number;
  successfulRows: number;
  failedRows: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  errorMessage?: string;
  createdAt: string;
  completedAt?: string;
}

export interface CorporateDashboardStats {
  totalCompanies: number;
  totalCorporateUsers: number;
  linkedUsers: number;
  totalCorporateRides: number;
  totalCorporateSpend: number;
  companiesByRides: Array<{ companyName: string; rides: number; spend: number }>;
}

// =====================================================
// Promo Stats Types
// =====================================================

export interface PromoUsageItem {
  promotionId: string;
  code: string;
  title: string;
  usageCount: number;
  totalDiscountMwk: number;
}

export interface DailyPromoUsage {
  date: string;
  redemptions: number;
  discountMwk: number;
}

export interface AdminPromoStats {
  days: number;
  totalRedemptions: number;
  totalDiscountMwk: number;
  totalOriginalFareMwk: number;
  totalActualFareMwk: number;
  topPromos: PromoUsageItem[];
  dailyUsage: DailyPromoUsage[];
}
