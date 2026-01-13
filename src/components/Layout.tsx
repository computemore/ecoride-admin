import { useState, type ReactNode } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSignalR } from '../context/SignalRContext';
import { useQuery } from '@tanstack/react-query';
import { getStats } from '../api';
import './Layout.css';

/**
 * Admin Dashboard Layout with Left Sidebar Navigation
 * Design principles:
 * - Persistent left-hand navigation pane
 * - No border-radius (strictly rectangular containers)
 * - Solid fill colors for active states, flat text for secondary
 * - Notification badges for pending approvals
 * - High-contrast, utility-first, professional logistics tool
 * - Pure Red (#FF0000) as the primary functional accent
 */
export default function Layout() {
  const { user } = useAuth();
  const { isConnected } = useSignalR();
  const navigate = useNavigate();
  const location = useLocation();

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // Fetch pending approval count for badge
  const { data: stats } = useQuery({
    queryKey: ['adminStats'],
    queryFn: getStats,
    refetchInterval: 30000,
  });

  const pendingApprovalCount = stats?.pendingApprovalCount ?? 0;

  // Keep "View Drivers" active for /drivers and /drivers/:id etc, but NOT for /drivers/new
  const driversNavActive =
    (location.pathname === '/drivers' || location.pathname.startsWith('/drivers/')) &&
    !location.pathname.startsWith('/drivers/new');

  const navItems = [
    { to: '/', label: 'Dashboard', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6', end: true },
    { to: '/pending-approvals', label: 'Pending Approvals', icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z', badge: pendingApprovalCount },
    { to: '/drivers/new', label: 'Register Driver', icon: 'M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z' },
    { to: '/drivers', label: 'View Drivers', icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z', activeOverride: driversNavActive },
    { to: '/vehicle-requests', label: 'Vehicle Requests', icon: 'M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10l2-2h7a1 1 0 001-1z' },
    { to: '/fleets', label: 'Fleets', icon: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10' },
    { to: '/corporate', label: 'Corporate', icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4' },
    { to: '/promotions', label: 'Promotions', icon: 'M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z' },
  ];

  return (
    <div className="min-h-screen bg-gray-100 flex">
      {/* Mobile overlay */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Left Sidebar - Desktop persistent, Mobile sliding */}
      <aside 
        className={`
          fixed lg:static inset-y-0 left-0 z-50
          ${sidebarCollapsed ? 'w-16' : 'w-64'}
          admin-header-bg text-white
          transform transition-all duration-200 ease-in-out
          ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        {/* Sidebar Header */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-white/20">
          {!sidebarCollapsed && (
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 flex items-center justify-center flex-shrink-0">
                <img src="/ecoride.svg" alt="Ecoride" className="h-7 w-7 object-contain" />
              </div>
              <span className="font-bold text-sm tracking-wide">ECORIDE ADMIN</span>
            </div>
          )}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="p-2 hover:bg-gray-800 hidden lg:block"
            title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={sidebarCollapsed ? 'M13 5l7 7-7 7M5 5l7 7-7 7' : 'M11 19l-7-7 7-7m8 14l-7-7 7-7'} />
            </svg>
          </button>
        </div>

        {/* Connection Status */}
        <div className={`px-4 py-3 border-b border-white/20 ${sidebarCollapsed ? 'px-2' : ''}`}>
          <div className="flex items-center gap-2" title={isConnected ? 'Real-time updates active' : 'Connecting...'}>
            <span className={`w-2 h-2 ${isConnected ? 'bg-[#00FF00]' : 'bg-yellow-500 animate-pulse'}`}></span>
            {!sidebarCollapsed && (
              <span className="text-xs text-gray-400">{isConnected ? 'Live' : 'Connecting...'}</span>
            )}
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 py-4 overflow-y-auto">
          {navItems.map((item) => (
            <SidebarNavLink
              key={item.to}
              to={item.to}
              end={item.end}
              collapsed={sidebarCollapsed}
              activeOverride={item.activeOverride}
              onClick={() => setMobileMenuOpen(false)}
            >
              <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} />
              </svg>
              {!sidebarCollapsed && (
                <span className="flex-1 flex items-center justify-between">
                  <span>{item.label}</span>
                  {item.badge !== undefined && (
                    <span 
                      className={`
                        min-w-[20px] h-5 px-1.5 flex items-center justify-center 
                        text-xs font-bold text-white
                        ${item.badge > 0 ? 'bg-[#FF0000]' : 'bg-green-600'}
                      `}
                    >
                      {item.badge}
                    </span>
                  )}
                </span>
              )}
              {sidebarCollapsed && item.badge !== undefined && item.badge > 0 && (
                <span className="absolute top-0 right-0 w-2 h-2 bg-[#FF0000]"></span>
              )}
            </SidebarNavLink>
          ))}
        </nav>

        {/* User Section at bottom */}
        <div className={`border-t border-white/20 p-4 ${sidebarCollapsed ? 'p-2' : ''}`}>
          <button
            onClick={() => navigate('/account')}
            className="w-full flex items-center gap-3 p-2 hover:bg-gray-800 transition-colors"
            title="Account settings"
          >
            <div className="w-8 h-8 bg-gray-700 flex items-center justify-center flex-shrink-0 overflow-hidden">
              {user?.profilePictureUrl ? (
                <img src={user.profilePictureUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="text-xs font-semibold">
                  {user?.firstName?.[0]}{user?.lastName?.[0]}
                </span>
              )}
            </div>
            {!sidebarCollapsed && (
              <div className="text-left min-w-0">
                <div className="text-sm font-medium truncate">
                  {user?.firstName} {user?.lastName}
                </div>
                <div className="text-xs text-gray-400 truncate">{user?.email}</div>
              </div>
            )}
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile Header */}
        <header className="lg:hidden h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4">
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="p-2 hover:bg-gray-100"
            aria-label="Open menu"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <div className="flex items-center gap-2">
            <div className="h-8 w-8">
              <img src="/ecoride.svg" alt="Ecoride" className="h-full w-full object-contain" />
            </div>
            <span className="font-bold text-sm">ECORIDE ADMIN</span>
          </div>
          <button
            onClick={() => navigate('/account')}
            className="p-2 hover:bg-gray-100"
            title="Account"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </button>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto">
          <div className="p-4 sm:p-6 lg:p-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}

function SidebarNavLink({
  to,
  end,
  children,
  collapsed,
  activeOverride,
  onClick,
}: {
  to: string;
  end?: boolean;
  children: ReactNode;
  collapsed: boolean;
  activeOverride?: boolean;
  onClick?: () => void;
}) {
  return (
    <NavLink
      to={to}
      end={end}
      onClick={onClick}
      className={({ isActive }) => {
        const computedIsActive = activeOverride ?? isActive;
        return `
          relative flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors
          ${collapsed ? 'justify-center px-2' : ''}
          ${computedIsActive 
            ? 'bg-[#FF0000] text-white' 
            : 'text-white/90 hover:bg-white/10 hover:text-white'
          }
        `;
      }}
    >
      {children}
    </NavLink>
  );
}
