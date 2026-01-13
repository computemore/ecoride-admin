import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import { getDrivers, deactivateDriver, activateDriver, getStats } from '../api';
import type { ListDriversQuery } from '../types';

export default function DriversPage() {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();

  const viewParam = (searchParams.get('view') ?? '').toLowerCase();
  const view: 'active' | 'deactivated' = viewParam === 'deactivated' ? 'deactivated' : 'active';
  const isActiveView = view === 'active';

  const [query, setQuery] = useState<ListDriversQuery>({
    page: 1,
    pageSize: 10,
    sortBy: 'created_at',
    sortOrder: 'desc',
    isActive: true,
  });
  const [searchInput, setSearchInput] = useState('');

  useEffect(() => {
    setQuery((prev) => ({
      ...prev,
      isActive: isActiveView,
      page: 1,
    }));
  }, [isActiveView]);

  const { data, isLoading, error } = useQuery({
    queryKey: ['drivers', query],
    queryFn: () => getDrivers(query),
  });

  const { data: stats } = useQuery({
    queryKey: ['adminStats'],
    queryFn: getStats,
    refetchInterval: 30000,
  });

  const deactivateMutation = useMutation({
    mutationFn: deactivateDriver,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drivers'] });
    },
  });

  const activateMutation = useMutation({
    mutationFn: activateDriver,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drivers'] });
    },
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setQuery({ ...query, search: searchInput, page: 1 });
  };

  const handleStatusFilter = (status: string) => {
    setQuery({ ...query, status: status || undefined, page: 1 });
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, string> = {
      online: 'badge-green',
      offline: 'badge-gray',
      busy: 'badge-yellow',
      on_trip: 'badge-blue',
    };
    return badges[status] || 'badge-gray';
  };

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 p-4">
        <p className="text-red-600">Failed to load drivers</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-8">
        <div>
          <h1 className="text-xl sm:text-xl md:text-2xl font-bold text-gray-900">{isActiveView ? 'Drivers' : 'Deactivated Drivers'}</h1>
          <p className="text-sm sm:text-sm md:text-base text-gray-500 mt-1 mb-2 sm:mb-2 md:mb-4 lg:mb-5">
            {isActiveView
              ? 'List of all drivers, you can click to see their details'
              : 'Drivers that have been deactivated due to various reasons'}
          </p>

          <div className="inline-flex items-center border border-gray-200 bg-white p-1">
            <button
              type="button"
              onClick={() => {
                const next = new URLSearchParams(searchParams);
                next.set('view', 'active');
                setSearchParams(next, { replace: true });
              }}
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                isActiveView
                  ? 'bg-primary-600 text-white'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              Active
            </button>
            <button
              type="button"
              onClick={() => {
                const next = new URLSearchParams(searchParams);
                next.set('view', 'deactivated');
                setSearchParams(next, { replace: true });
              }}
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                !isActiveView
                  ? 'bg-primary-600 text-white'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              Deactivated
            </button>
          </div>
        </div>
        <Link to="/drivers/new?modal=1&type=individual" className="btn-green flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Register Driver
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="card">
          <div className="text-sm font-medium text-gray-500">Total Drivers</div>
          <div className="mt-1 text-2xl font-bold text-gray-900">{stats?.totalDrivers ?? '—'}</div>
        </div>
        <div className="card">
          <div className="text-sm font-medium text-gray-500">Active Drivers</div>
          <div className="mt-1 text-2xl font-bold text-gray-900">{stats?.activeDrivers ?? '—'}</div>
        </div>
        <div className="card">
          <div className="text-sm font-medium text-gray-500">Online Drivers</div>
          <div className="mt-1 text-2xl font-bold text-gray-900">{stats?.onlineDrivers ?? '—'}</div>
        </div>
        <div className="card">
          <div className="text-sm font-medium text-gray-500">On Trip</div>
          <div className="mt-1 text-2xl font-bold text-gray-900">{stats?.onTripDrivers ?? '—'}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="card mb-6 w-full flex">
        <div className="flex flex-col md:flex-row gap-4 w-full">
          <form onSubmit={handleSearch} className="w-full md:w-3/4 lg:w-3/4">
            <div className="relative w-full">
              <input
                type="text"
                placeholder="Search by name, email, or license..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="input w-full pl-10"
                style={{ paddingLeft: '2.6rem' }}
              />
              <svg className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </form>
          <select
            value={query.status || ''}
            onChange={(e) => handleStatusFilter(e.target.value)}
            className="input w-full md:w-1/4 lg:w-1/4"
            style={{ paddingLeft: '0.6rem' }}
          >
            <option value="">All Statuses</option>
            <option value="online">Online</option>
            <option value="offline">Offline</option>
            <option value="busy">Busy</option>
            <option value="on_trip">On Trip</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="card p-0">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          </div>
        ) : (
          <>
            {/* Mobile stacked list */}
            <div className="sm:hidden">
              <div className="divide-y divide-gray-200">
                {data?.drivers.map((driver) => (
                  <div key={driver.id} className="px-4 py-4">
                    <div className="flex flex-col gap-2">
                      {/* Line 1: Driver / License / Status / Rating */}
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center shrink-0">
                            {driver.profilePictureUrl ? (
                              <img src={driver.profilePictureUrl} alt="" className="w-10 h-10 rounded-full object-cover" />
                            ) : (
                              <span className="text-primary-700 font-medium text-sm">
                                {driver.fullName
                                  .split(' ')
                                  .map((n) => n[0])
                                  .join('')}
                              </span>
                            )}
                          </div>
                          <div className="min-w-0">
                            <Link to={`/drivers/${driver.id}`} className="font-medium text-gray-900 hover:text-primary-600 truncate block">
                              {driver.fullName}
                            </Link>
                            <p className="text-sm text-gray-500 truncate">{driver.email}</p>
                          </div>
                        </div>

                        <div className="text-sm text-gray-500">
                          {driver.licenseNumber}
                        </div>

                        <div className="flex items-center gap-2">
                          <span className={`badge ${getStatusBadge(driver.status)}`}>{driver.status}</span>
                          {!driver.isActive && <span className="badge badge-red">Inactive</span>}
                        </div>

                        <div className="flex items-center gap-1">
                          <svg className="w-4 h-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                          <span className="text-sm text-gray-700">{driver.rating.toFixed(2)}</span>
                        </div>
                      </div>

                      {/* Line 2: Total Trips / Vehicles / Actions */}
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                        <div className="text-sm text-gray-500">Trips {driver.totalTrips}</div>
                        <div className="text-sm text-gray-500">Vehicles {driver.vehicleCount}</div>

                        <div className="flex items-center gap-3 ml-auto">
                          <Link to={`/drivers/${driver.id}`} className="text-primary-600 hover:text-primary-800">
                            View
                          </Link>
                          {driver.isActive ? (
                            <button
                              onClick={() => {
                                if (confirm('Are you sure you want to deactivate this driver?')) {
                                  deactivateMutation.mutate(driver.id);
                                }
                              }}
                              className="text-red-600 hover:text-red-800"
                              disabled={deactivateMutation.isPending}
                            >
                              Deactivate
                            </button>
                          ) : (
                            <button
                              onClick={() => activateMutation.mutate(driver.id)}
                              className="text-green-600 hover:text-green-800"
                              disabled={activateMutation.isPending}
                            >
                              Activate
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Desktop table */}
            <div className="overflow-x-auto hidden sm:block">
              <table className="w-full min-w-[980px]">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Driver</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">License</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rating</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Trips</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vehicles</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {data?.drivers.map((driver) => (
                    <tr key={driver.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                            {driver.profilePictureUrl ? (
                              <img src={driver.profilePictureUrl} alt="" className="w-10 h-10 rounded-full object-cover" />
                            ) : (
                              <span className="text-primary-700 font-medium text-sm">
                                {driver.fullName
                                  .split(' ')
                                  .map((n) => n[0])
                                  .join('')}
                              </span>
                            )}
                          </div>
                          <div>
                            <Link to={`/drivers/${driver.id}`} className="font-medium text-gray-900 hover:text-primary-600">
                              {driver.fullName}
                            </Link>
                            <p className="text-sm text-gray-500">{driver.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{driver.licenseNumber}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`badge ${getStatusBadge(driver.status)}`}>{driver.status}</span>
                        {!driver.isActive && <span className="badge badge-red ml-2">Inactive</span>}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          <svg className="w-4 h-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                          <span className="text-sm text-gray-700">{driver.rating.toFixed(2)}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{driver.totalTrips}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{driver.vehicleCount}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link to={`/drivers/${driver.id}`} className="text-primary-600 hover:text-primary-800">
                            View
                          </Link>
                          {driver.isActive ? (
                            <button
                              onClick={() => {
                                if (confirm('Are you sure you want to deactivate this driver?')) {
                                  deactivateMutation.mutate(driver.id);
                                }
                              }}
                              className="text-red-600 hover:text-red-800"
                              disabled={deactivateMutation.isPending}
                            >
                              Deactivate
                            </button>
                          ) : (
                            <button
                              onClick={() => activateMutation.mutate(driver.id)}
                              className="text-green-600 hover:text-green-800"
                              disabled={activateMutation.isPending}
                            >
                              Activate
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Empty state */}
            {data?.drivers.length === 0 && (
              <div className="text-center py-12">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900">No drivers found</h3>
                <p className="mt-1 text-sm text-gray-500">
                  {query.search ? 'Try adjusting your search or filters.' : 'Get started by registering a new driver.'}
                </p>
                <div className="mt-6">
                  <Link to="/drivers/new" className="btn-primary">
                    Register Driver
                  </Link>
                </div>
              </div>
            )}

            {/* Pagination */}
            {data && data.totalPages > 1 && (
              <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200">
                <p className="text-sm text-gray-500">
                  Showing {((data.page - 1) * data.pageSize) + 1} to {Math.min(data.page * data.pageSize, data.totalCount)} of {data.totalCount} drivers
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setQuery({ ...query, page: query.page! - 1 })}
                    disabled={!data.hasPreviousPage}
                    className="btn-secondary disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setQuery({ ...query, page: query.page! + 1 })}
                    disabled={!data.hasNextPage}
                    className="btn-secondary disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
