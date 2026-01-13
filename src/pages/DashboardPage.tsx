import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { adminCancelRide, adminReassignRide, downloadGrowthFinancePdf, downloadGrowthFinanceXlsx, getCharts, getGrowthFinance, getLiveRides, getPulse, getPromoStats, getStats } from '../api';
import AdminLiveMap from '../components/AdminLiveMap';

/**
 * Format currency as MK with thousands separators
 * e.g., 150000 -> "MK 150,000"
 */
function formatMK(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—';
  return `MK ${value.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

/**
 * Format currency as MK with decimals for smaller amounts
 * e.g., 1500.50 -> "MK 1,500.50"
 */
function formatMKDecimal(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—';
  return `MK ${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function DashboardPage() {

  const queryClient = useQueryClient();

  const mapCenters = {
    blantyre: [-15.7861, 35.0058] as [number, number],
    lilongwe: [-13.9833, 33.7833] as [number, number],
  } as const;

  const [mapCity, setMapCity] = useState<keyof typeof mapCenters>('blantyre');

  // days options
  const dayOptions = [90, 30, 14, 7, 3] as const;
  const [ridesDays, setRidesDays] = useState<(typeof dayOptions)[number]>(14);
  const [ridesSummaryDays, setRidesSummaryDays] = useState<(typeof dayOptions)[number]>(14);
  const [earningsSummaryDays, setEarningsSummaryDays] = useState<(typeof dayOptions)[number]>(14);

  const { data: stats, isLoading, error } = useQuery({
    queryKey: ['adminStats'],
    queryFn: getStats,
    refetchInterval: 30000,
  });

  const { data: liveRides } = useQuery({
    queryKey: ['adminLiveRides'],
    queryFn: () => getLiveRides({ limit: 25 }),
    refetchInterval: 15000,
  });

  const formatLiveRideStatus = (status: string | null | undefined) => {
    if (!status) return '—';
    return status
      .toString()
      .replace(/_/g, ' ')
      .trim()
      .replace(/\b\w/g, (c: string) => c.toUpperCase());
  };

  const cancelRideMutation = useMutation({
    mutationFn: ({ rideId, reason }: { rideId: string; reason?: string }) => adminCancelRide(rideId, { reason }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['adminLiveRides'] }),
        queryClient.invalidateQueries({ queryKey: ['adminStats'] }),
      ]);
    },
  });

  const reassignRideMutation = useMutation({
    mutationFn: (rideId: string) => adminReassignRide(rideId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['adminLiveRides'] });
    },
  });

  const { data: pulse } = useQuery({
    queryKey: ['adminPulse'],
    queryFn: getPulse,
    refetchInterval: 30000,
  });

  const growthDays = 30;
  const { data: growth } = useQuery({
    queryKey: ['adminGrowthFinance', growthDays],
    queryFn: () => getGrowthFinance(growthDays),
    refetchInterval: 300000,
  });

  // Promo stats
  const promoStatsDays = 30;
  const { data: promoStats } = useQuery({
    queryKey: ['adminPromoStats', promoStatsDays],
    queryFn: () => getPromoStats(promoStatsDays),
    refetchInterval: 300000,
  });

  const [isExportingGrowth, setIsExportingGrowth] = useState(false);

  const { data: charts } = useQuery({
    queryKey: ['adminCharts', 14],
    queryFn: () => getCharts(14),
    refetchInterval: 60000,
  });

  const { data: ridesCharts } = useQuery({
    queryKey: ['adminCharts', ridesDays],
    queryFn: () => getCharts(ridesDays),
    refetchInterval: 60000,
  });

  const { data: ridesSummaryCharts } = useQuery({
    queryKey: ['adminCharts', ridesSummaryDays],
    queryFn: () => getCharts(ridesSummaryDays),
    refetchInterval: 60000,
  });

  const { data: earningsSummaryCharts } = useQuery({
    queryKey: ['adminCharts', earningsSummaryDays],
    queryFn: () => getCharts(earningsSummaryDays),
    refetchInterval: 60000,
  });

  // rides per period of time
  const ridesDaysLabel = ridesCharts?.days ?? charts?.days ?? ridesDays;
  const ridesPerDay = ridesCharts?.ridesPerDay ?? charts?.ridesPerDay ?? [];  

  const ridesSummarySeries = ridesSummaryCharts?.ridesPerDay ?? [];
  const ridesToday = stats?.totalRidesToday ?? 0;
  const ridesYesterday = ridesSummarySeries.length >= 2 ? ridesSummarySeries[ridesSummarySeries.length - 2].value : null;
  const ridesTodayValue = ridesSummarySeries.length >= 1 ? ridesSummarySeries[ridesSummarySeries.length - 1].value : null;
  const ridesTrendPct =
    ridesYesterday !== null && ridesYesterday > 0 && ridesTodayValue !== null
      ? ((ridesTodayValue - ridesYesterday) / ridesYesterday) * 100
      : null;
  const ridesTrendIsUp = ridesTrendPct !== null ? ridesTrendPct >= 0 : true;

  const earningsSummarySeries = earningsSummaryCharts?.earningsPerDay ?? [];
  const earningsToday = stats?.totalEarningsToday ?? 0;
  const earningsYesterday = earningsSummarySeries.length >= 2 ? earningsSummarySeries[earningsSummarySeries.length - 2].value : null;
  const earningsTodayValue = earningsSummarySeries.length >= 1 ? earningsSummarySeries[earningsSummarySeries.length - 1].value : null;
  const earningsTrendPct =
    earningsYesterday !== null && earningsYesterday > 0 && earningsTodayValue !== null
      ? ((earningsTodayValue - earningsYesterday) / earningsYesterday) * 100
      : null;
  const earningsTrendIsUp = earningsTrendPct !== null ? earningsTrendPct >= 0 : true;
  const completionRate =
    (stats?.totalDrivers ?? 0) > 0
      ? Math.round(((stats?.activeDrivers ?? 0) / (stats?.totalDrivers ?? 1)) * 100)
      : 0;

  const approvalBreakdown = charts?.driversByApprovalStatus ?? [];
  const approvalTotal = approvalBreakdown.reduce((sum, p) => sum + (p.value ?? 0), 0);
  const approvedCount = approvalBreakdown.find((p) => String(p.category).toLowerCase().includes('approved'))?.value ?? 0;
  const approvedPct = approvalTotal > 0 ? Math.round((approvedCount / approvalTotal) * 100) : 0;

  const feeBreakdown = charts?.driversByRegistrationFeeStatus ?? [];
  const feeTotal = feeBreakdown.reduce((sum, p) => sum + (p.value ?? 0), 0);
  const paidCount = feeBreakdown.find((p) => String(p.category).toLowerCase().includes('paid'))?.value ?? 0;
  const paidPct = feeTotal > 0 ? Math.round((paidCount / feeTotal) * 100) : 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="spinner w-12 h-12 border-4"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 p-4">
        <p className="text-red-600">Failed to load dashboard stats</p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 uppercase tracking-wide">Dashboard</h1>
      <p className="text-base text-gray-500 mt-1 mb-8">
        Visualise and monitor driver activity and performance
      </p>

      {/* Operational Health (Daily Pulse) */}
      <div className="mb-8">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Operational Health (Daily Pulse)</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          <div className="bg-white border border-gray-200 p-4">
            <div className="text-sm font-semibold text-gray-500 uppercase">Rider : Driver Ratio</div>
            <div className="mt-1 text-[28px] font-bold text-gray-900">
              {pulse?.riderToDriverRatio === null || pulse?.riderToDriverRatio === undefined
                ? '—'
                : `${pulse.riderToDriverRatio.toFixed(2)}x`}
            </div>
            <div className="mt-1 text-base text-gray-500">
              {pulse ? `${pulse.activeRidersToday} active riders / ${pulse.onlineDrivers} online drivers` : '—'}
            </div>
          </div>

          <div className="bg-white border border-gray-200 p-4">
            <div className="text-sm font-semibold text-gray-500 uppercase">Fulfillment Rate Today</div>
            <div className="mt-1 text-[28px] font-bold text-gray-900">
              {pulse ? `${pulse.fulfillmentRateTodayPercent.toFixed(0)}%` : '—'}
            </div>
            <div className="mt-1 text-base text-gray-500">
              {pulse ? `${pulse.totalRidesCompletedToday} completed / ${pulse.totalRidesRequestedToday} requested` : '—'}
            </div>
          </div>

          <div className="bg-white border border-gray-200 p-4">
            <div className="text-sm font-semibold text-gray-500 uppercase">Average Wait Time (ETA)</div>
            <div className="mt-1 text-[28px] font-bold text-gray-900">
              {pulse?.averageWaitTimeMinutesToday === null || pulse?.averageWaitTimeMinutesToday === undefined
                ? '—'
                : `${pulse.averageWaitTimeMinutesToday.toFixed(0)}m`}
            </div>
          </div>

          <div className="bg-white border border-gray-200 p-4">
            <div className="text-sm font-semibold text-gray-500 uppercase">Total KM Driven</div>
            <div className="mt-1 text-[28px] font-bold text-gray-900">
              {pulse ? `${pulse.totalKilometresDrivenToday.toFixed(1)} km` : '—'}
            </div>
            <div className="mt-1 text-base text-gray-500">
              {pulse ? `All-time: ${pulse.totalKilometresDrivenAllTime.toFixed(0)} km` : '—'}
            </div>
          </div>

          <div className="bg-white border border-gray-200 p-4">
            <div className="text-sm font-semibold text-gray-500 uppercase">Total Hours Logged (Today)</div>
            <div className="mt-1 text-[28px] font-bold text-gray-900">
              {pulse ? `${pulse.onTripHoursToday.toFixed(1)}h` : '—'}
            </div>
            <div className="mt-1 text-base text-gray-500">
              Online: {pulse?.onlineHoursToday === null || pulse?.onlineHoursToday === undefined ? '—' : `${pulse.onlineHoursToday.toFixed(1)}h`} · On Trip: {pulse ? `${pulse.onTripHoursToday.toFixed(1)}h` : '—'}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-white border border-gray-200 p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-gray-500 uppercase">Rides Today</h3>
              <div className="text-base text-gray-400">Trend window: last {ridesSummaryDays} days</div>
            </div>
            <div className="inline-flex items-center border border-gray-200 bg-white p-1">
              {dayOptions.map((d) => (
                <button
                  key={`rides_${d}`}
                  type="button"
                  onClick={() => setRidesSummaryDays(d)}
                  className={
                    ridesSummaryDays === d
                      ? 'px-2.5 py-1 text-xs font-medium bg-[#FF0000] text-white'
                      : 'px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-100'
                  }
                >
                  {d}d
                </button>
              ))}
            </div>
          </div>

          <div className="mt-2 flex items-end justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[28px] font-bold text-gray-900 leading-tight">{ridesToday}</p>
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
                <small className={`text-base ${ridesTrendIsUp ? 'text-green-600' : 'text-[#FF0000]'}`}>
                  {ridesTrendPct === null
                    ? '— vs yesterday'
                    : `${ridesTrendIsUp ? '↑' : '↓'} ${Math.abs(ridesTrendPct).toFixed(0)}% vs yesterday`}
                </small>
                <small className="text-base text-gray-500">{completionRate}% Completion Rate</small>
              </div>
            </div>
            <div className="w-28 h-10 text-[#FF0000] flex-shrink-0">
              <Sparkline values={ridesSummarySeries.map((p) => p.value)} />
            </div>
          </div>
        </div>
        <div className="bg-white border border-gray-200 p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-gray-500 uppercase">Earnings Today</h3>
              <div className="text-base text-gray-400">Trend window: last {earningsSummaryDays} days</div>
            </div>
            <div className="inline-flex items-center border border-gray-200 bg-white p-1">
              {dayOptions.map((d) => (
                <button
                  key={`earnings_${d}`}
                  type="button"
                  onClick={() => setEarningsSummaryDays(d)}
                  className={
                    earningsSummaryDays === d
                      ? 'px-2.5 py-1 text-xs font-medium bg-[#FF0000] text-white'
                      : 'px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-100'
                  }
                >
                  {d}d
                </button>
              ))}
            </div>
          </div>

          <div className="mt-2 flex items-end justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[28px] font-bold text-gray-900 leading-tight">
                {formatMK(earningsToday)}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
                <small className={`text-base ${earningsTrendIsUp ? 'text-green-600' : 'text-[#FF0000]'}`}>
                  {earningsTrendPct === null
                    ? '— vs yesterday'
                    : `${earningsTrendIsUp ? '↑' : '↓'} ${Math.abs(earningsTrendPct).toFixed(0)}% vs yesterday`}
                </small>
              </div>
            </div>
            <div className="w-28 h-10 text-[#FF0000] flex-shrink-0">
              <Sparkline values={earningsSummarySeries.map((p) => p.value)} />
            </div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8">
        {charts && (
          <div className="bg-white border border-gray-200 p-4 lg:col-span-4">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
              <h2 className="text-sm font-semibold text-gray-500 uppercase">Rides (last {ridesDaysLabel} days)</h2>
              <div className="inline-flex border border-gray-200 bg-white p-1">
                {dayOptions.map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setRidesDays(d)}
                    className={
                      d === ridesDays
                        ? 'px-2.5 py-1 text-xs sm:text-sm font-medium bg-gray-900 text-white'
                        : 'px-2.5 py-1 text-xs sm:text-sm font-medium text-gray-700 hover:bg-gray-100'
                    }
                  >
                    {d}d
                  </button>
                ))}
              </div>
            </div>

            <div className="w-full h-[260px]">
              <ResponsiveContainer>
                <BarChart data={ridesPerDay} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="date" hide />
                  <YAxis />
                  <Tooltip 
                    contentStyle={{ borderRadius: 0, border: '1px solid #e5e7eb' }}
                  />
                  <Bar dataKey="value" fill="#D1D5DB" radius={0}>
                    {ridesPerDay.map((entry, index) => {
                      // Color bars based on trend: green = increase, red = decrease, gray = neutral
                      const prevValue = index > 0 ? ridesPerDay[index - 1].value : entry.value;
                      const isUp = entry.value > prevValue;
                      const isDown = entry.value < prevValue;
                      let fillColor = '#D1D5DB'; // Neutral gray
                      if (isUp) fillColor = '#22C55E'; // Green for increase
                      else if (isDown) fillColor = '#EF4444'; // Red for decrease
                      return (
                        <Cell key={`cell-${index}`} fill={fillColor} />
                      );
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

        )}

        <div className="bg-white border border-gray-200 p-4 lg:col-span-8">
          <div className="flex items-start justify-between gap-3 mb-4">
            <h2 className="text-sm font-semibold text-gray-500 uppercase">Live Map</h2>
            <div className="text-base text-gray-500">Drivers & surge visualization</div>
          </div>
          <div className="mb-4 flex items-center gap-2">
            <div className="inline-flex items-center border border-gray-200 bg-white p-1">
              <button
                type="button"
                onClick={() => setMapCity('blantyre')}
                className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                  mapCity === 'blantyre'
                    ? 'bg-[#FF0000] text-white'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                Blantyre
              </button>
              <button
                type="button"
                onClick={() => setMapCity('lilongwe')}
                className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                  mapCity === 'lilongwe'
                    ? 'bg-[#FF0000] text-white'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                Lilongwe
              </button>
            </div>
          </div>
          <AdminLiveMap center={mapCenters[mapCity]} zoom={12} />
        </div>
      </div>

      {/* Summary KPIs (replace 100% pie charts) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white border border-gray-200 p-4">
          <div className="text-sm font-semibold text-gray-500 uppercase">Driver Approvals</div>
          <div className="mt-2 text-[28px] font-bold text-gray-900">Total Drivers: {stats?.totalDrivers ?? 0}</div>
          <div className={`mt-2 text-sm font-medium ${approvedPct === 100 ? 'text-green-600' : 'text-gray-700'}`}>
            Status: {approvedPct}% Approved
          </div>
          <div className="mt-1 text-xs text-gray-500">
            Pending approvals: {stats?.pendingApprovalCount ?? 0}
          </div>
        </div>
        <div className="bg-white border border-gray-200 p-4">
          <div className="text-sm font-semibold text-gray-500 uppercase">Registration Fees</div>
          <div className="mt-2 text-[28px] font-bold text-gray-900">Total Drivers: {stats?.totalDrivers ?? 0}</div>
          <div className={`mt-2 text-sm font-medium ${paidPct === 100 ? 'text-green-600' : 'text-gray-700'}`}>
            Status: {paidPct}% Paid
          </div>
          <div className="mt-1 text-xs text-gray-500">Use breakdown charts when there’s a real split.</div>
        </div>
      </div>

      {/* Growth & Finance */}
      <div className="mb-8">
        <div className="flex items-start justify-between gap-3 mb-4">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Growth &amp; Finance</h2>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="btn-secondary"
              disabled={isExportingGrowth}
              onClick={async () => {
                try {
                  setIsExportingGrowth(true);
                  await downloadGrowthFinancePdf(growthDays);
                } finally {
                  setIsExportingGrowth(false);
                }
              }}
            >
              {isExportingGrowth ? 'Downloading…' : 'Download PDF'}
            </button>
            <button
              type="button"
              className="btn-outline"
              disabled={isExportingGrowth}
              onClick={async () => {
                try {
                  setIsExportingGrowth(true);
                  await downloadGrowthFinanceXlsx(growthDays);
                } finally {
                  setIsExportingGrowth(false);
                }
              }}
            >
              {isExportingGrowth ? 'Downloading…' : 'Download XLSX'}
            </button>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white border border-gray-200 p-4">
            <div className="text-sm font-semibold text-gray-500 uppercase">Acquisition Funnel ({growthDays}d)</div>
            <div className="mt-3 space-y-2 text-base">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">New Riders</span>
                <span className="font-semibold text-gray-900">{growth?.newRiders ?? '—'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Requested Ride</span>
                <span className="font-semibold text-gray-900">{growth?.ridersRequestedRide ?? '—'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Completed Ride</span>
                <span className="font-semibold text-gray-900">{growth?.ridersCompletedRide ?? '—'}</span>
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 p-4">
            <div className="text-sm font-semibold text-gray-500 uppercase">ARPU ({growthDays}d)</div>
            <div className="mt-3 space-y-2 text-base">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Rider</span>
                <span className="font-semibold text-gray-900">
                  {formatMKDecimal(growth?.arpuRiderMwk)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Driver</span>
                <span className="font-semibold text-gray-900">
                  {formatMKDecimal(growth?.arpuDriverMwk)}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 p-4">
            <div className="text-sm font-semibold text-gray-500 uppercase">Churn Rate ({growthDays}d)</div>
            <div className="mt-3 space-y-2 text-base">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Rider</span>
                <span className="font-semibold text-gray-900">
                  {growth?.riderChurnRatePercent === null || growth?.riderChurnRatePercent === undefined ? '—' : `${growth.riderChurnRatePercent.toFixed(0)}%`}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Driver</span>
                <span className="font-semibold text-gray-900">
                  {growth?.driverChurnRatePercent === null || growth?.driverChurnRatePercent === undefined ? '—' : `${growth.driverChurnRatePercent.toFixed(0)}%`}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 p-4">
            <div className="text-sm font-semibold text-gray-500 uppercase">CAC ({growthDays}d)</div>
            <div className="mt-1 text-[28px] font-bold text-gray-900">
              {formatMKDecimal(growth?.cacMwk)}
            </div>
          </div>
        </div>
      </div>

      {/* Promotional Impact */}
      <div className="mb-8">
        <div className="flex items-start justify-between gap-3 mb-4">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Promotional Impact ({promoStatsDays}d)</h2>
          <Link 
            to="/promotions" 
            className="text-sm text-[#FF0000] hover:underline"
          >
            Manage Promotions →
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white border border-gray-200 p-4">
            <div className="text-sm font-semibold text-gray-500 uppercase">Total Redemptions</div>
            <div className="mt-1 text-[28px] font-bold text-gray-900">
              {promoStats?.totalRedemptions ?? 0}
            </div>
            <div className="mt-1 text-xs text-gray-500">Rides with promo applied</div>
          </div>

          <div className="bg-white border border-gray-200 p-4">
            <div className="text-sm font-semibold text-gray-500 uppercase">Total Discounts Given</div>
            <div className="mt-1 text-[28px] font-bold text-[#FF0000]">
              -{formatMK(promoStats?.totalDiscountMwk ?? 0)}
            </div>
            <div className="mt-1 text-xs text-gray-500">Revenue impact from promos</div>
          </div>

          <div className="bg-white border border-gray-200 p-4">
            <div className="text-sm font-semibold text-gray-500 uppercase">Original Fares</div>
            <div className="mt-1 text-[28px] font-bold text-gray-900">
              {formatMK(promoStats?.totalOriginalFareMwk ?? 0)}
            </div>
            <div className="mt-1 text-xs text-gray-500">Before promo discounts</div>
          </div>

          <div className="bg-white border border-gray-200 p-4">
            <div className="text-sm font-semibold text-gray-500 uppercase">Actual Earnings</div>
            <div className="mt-1 text-[28px] font-bold text-green-600">
              {formatMK(promoStats?.totalActualFareMwk ?? 0)}
            </div>
            <div className="mt-1 text-xs text-gray-500">After promo discounts</div>
          </div>
        </div>

        {/* Top Promos Table */}
        {promoStats?.topPromos && promoStats.topPromos.length > 0 && (
          <div className="mt-4 bg-white border border-gray-200 p-4">
            <h3 className="text-sm font-semibold text-gray-500 uppercase mb-3">Top Promotions</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 px-3 font-medium text-gray-600">Code</th>
                    <th className="text-left py-2 px-3 font-medium text-gray-600">Title</th>
                    <th className="text-right py-2 px-3 font-medium text-gray-600">Redemptions</th>
                    <th className="text-right py-2 px-3 font-medium text-gray-600">Total Discount</th>
                  </tr>
                </thead>
                <tbody>
                  {promoStats.topPromos.slice(0, 5).map((promo) => (
                    <tr key={promo.promotionId} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-2 px-3 font-mono text-[#FF0000]">{promo.code}</td>
                      <td className="py-2 px-3 text-gray-900">{promo.title}</td>
                      <td className="py-2 px-3 text-right font-semibold">{promo.usageCount}</td>
                      <td className="py-2 px-3 text-right text-[#FF0000]">-{formatMK(promo.totalDiscountMwk)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Alerts */}
      {((stats?.pendingApprovalCount ?? 0) > 0 || (stats?.pendingKycCount ?? 0) > 0 || (stats?.expiringLicensesCount ?? 0) > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {(stats?.pendingApprovalCount ?? 0) > 0 && (
            <Link to="/pending-approvals" className="bg-white border border-gray-200 border-l-4 border-l-orange-400 p-4 hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-100 relative">
                  <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
                    />
                  </svg>
                  <span className="absolute -top-2 -right-2 bg-orange-500 text-white text-xs font-bold px-2 py-0.5">
                    {stats?.pendingApprovalCount}
                  </span>
                </div>
                <div>
                  <h3 className="text-base font-medium text-gray-900">Pending Approvals</h3>
                  <p className="text-base text-gray-500">{stats?.pendingApprovalCount} drivers awaiting review</p>
                </div>
              </div>
            </Link>
          )}
          {(stats?.pendingKycCount ?? 0) > 0 && (
            <div className="bg-white border border-gray-200 border-l-4 border-l-yellow-400 p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-yellow-100">
                  <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    />
                  </svg>
                </div>
                <div>
                  <h3 className="text-base font-medium text-gray-900">Pending KYC</h3>
                  <p className="text-base text-gray-500">{stats?.pendingKycCount} drivers need verification</p>
                </div>
              </div>
            </div>
          )}
          {(stats?.expiringLicensesCount ?? 0) > 0 && (
            <div className="bg-white border border-gray-200 border-l-4 border-l-[#FF0000] p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-100">
                  <svg className="w-5 h-5 text-[#FF0000]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <div>
                  <h3 className="text-base font-medium text-gray-900">Expiring Licenses</h3>
                  <p className="text-base text-gray-500">{stats?.expiringLicensesCount} licenses expire in 30 days</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Live Activity */}
      <div className="bg-white border border-gray-200 p-4">
        <h2 className="text-sm font-semibold text-gray-500 uppercase mb-4">Live Activity</h2>

        {liveRides?.rides && liveRides.rides.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full text-base">
              <thead>
                <tr className="text-left text-sm font-semibold text-gray-500 uppercase border-b border-gray-200">
                  <th className="py-2 pr-4">Rider</th>
                  <th className="py-2 pr-4">Driver</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2 pr-4">ETA</th>
                  <th className="py-2 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {liveRides.rides.map((r) => (
                  <tr key={r.id} className="border-b border-gray-200 last:border-0">
                    <td className="py-3 pr-4 text-gray-900 font-medium whitespace-nowrap">{r.riderName}</td>
                    <td className="py-3 pr-4 text-gray-700 whitespace-nowrap">{r.driverName ?? '—'}</td>
                    <td className="py-3 pr-4 text-gray-700 whitespace-nowrap">{formatLiveRideStatus(r.status)}</td>
                    <td className="py-3 pr-4 text-gray-700 whitespace-nowrap">{r.etaMinutes === null || r.etaMinutes === undefined ? '—' : `${r.etaMinutes}m`}</td>
                    <td className="py-3 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => cancelRideMutation.mutate({ rideId: r.id })}
                          className="px-3 py-1.5 text-xs font-semibold border border-[#FF0000] text-[#FF0000] hover:bg-red-50 disabled:opacity-50"
                          disabled={cancelRideMutation.isPending}
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => reassignRideMutation.mutate(r.id)}
                          className="px-3 py-1.5 text-xs font-semibold border border-gray-300 text-gray-700 hover:bg-gray-100 disabled:opacity-50"
                          disabled={reassignRideMutation.isPending}
                        >
                          Re-assign
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-500 text-base">No live rides</p>
        )}
      </div>
    </div>
  );
}

function Sparkline({ values }: { values: number[] }) {
  const points = useMemo(() => {
    const clean = values.filter((v) => Number.isFinite(v));
    if (clean.length === 0) return '';

    const width = 112;
    const height = 40;
    const padding = 2;
    const min = Math.min(...clean);
    const max = Math.max(...clean);
    const span = Math.max(1e-6, max - min);

    return clean
      .map((v, i) => {
        const x = padding + (i * (width - padding * 2)) / Math.max(1, clean.length - 1);
        const y = height - padding - ((v - min) * (height - padding * 2)) / span;
        return `${x.toFixed(2)},${y.toFixed(2)}`;
      })
      .join(' ');
  }, [values]);

  return (
    <svg viewBox="0 0 112 40" className="w-full h-full" aria-hidden="true">
      <polyline fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" points={points} />
    </svg>
  );
}
