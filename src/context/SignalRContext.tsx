import { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import * as signalR from '@microsoft/signalr';
import { useQueryClient } from '@tanstack/react-query';

interface DriverEvent {
  id: string;
  fullName?: string;
  [key: string]: unknown;
}

interface LocationEvent {
  driverId: string;
  latitude: number;
  longitude: number;
}

interface SignalRContextType {
  connection: signalR.HubConnection | null;
  connectionState: signalR.HubConnectionState;
  isConnected: boolean;
}

interface AdminToast {
  title: string;
  message: string;
}

const SignalRContext = createContext<SignalRContextType>({
  connection: null,
  connectionState: signalR.HubConnectionState.Disconnected,
  isConnected: false,
});

export function useSignalR() {
  return useContext(SignalRContext);
}

interface SignalRProviderProps {
  children: ReactNode;
}

function stripTrailingSlash(url: string) {
  return url.endsWith('/') ? url.slice(0, -1) : url;
}

function resolveHubBaseUrl() {
  const explicit = import.meta.env.VITE_HUB_API_URL || import.meta.env.VITE_HUB_URL;
  if (explicit) return stripTrailingSlash(explicit);

  const api = import.meta.env.VITE_API_URL;
  if (api && /^https?:\/\//i.test(api)) {
    const origin = stripTrailingSlash(api).replace(/\/api$/i, '');
    return `${origin}/hubs`;
  }

  // Default to production API for local testing
  return 'https://ecoride-4560.onrender.com/hubs';
}

export function SignalRProvider({ children }: SignalRProviderProps) {
  const [connection, setConnection] = useState<signalR.HubConnection | null>(null);
  const [connectionState, setConnectionState] = useState<signalR.HubConnectionState>(
    signalR.HubConnectionState.Disconnected
  );
  const [toast, setToast] = useState<AdminToast | null>(null);
  const toastTimeoutRef = useRef<number | null>(null);
  const queryClient = useQueryClient();

  const showToast = (next: AdminToast) => {
    if (toastTimeoutRef.current) {
      window.clearTimeout(toastTimeoutRef.current);
    }

    setToast(next);
    toastTimeoutRef.current = window.setTimeout(() => {
      setToast(null);
      toastTimeoutRef.current = null;
    }, 6000);
  };

  // Set up SignalR connection
  useEffect(() => {
    const token = localStorage.getItem('admin_token');
    if (!token) return;

    const hubBaseUrl = resolveHubBaseUrl();

    const newConnection = new signalR.HubConnectionBuilder()
      .withUrl(`${hubBaseUrl}/admin`, {
        accessTokenFactory: () => token,
      })
      .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
      .configureLogging(signalR.LogLevel.Information)
      .build();

    // Set up event handlers
    newConnection.on('DriverRegistered', (driver: DriverEvent) => {
      console.log('New driver registered:', driver);
      showToast({
        title: 'New driver registration',
        message: `${driver.fullName || 'A driver'} is pending approval.`,
      });
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['pendingDrivers'] });
      queryClient.invalidateQueries({ queryKey: ['adminStats'] });
    });

    newConnection.on('DriverApproved', (driver: DriverEvent) => {
      console.log('Driver approved:', driver);
      showToast({
        title: 'Driver approved',
        message: `${driver.fullName || 'A driver'} was approved.`,
      });
      queryClient.invalidateQueries({ queryKey: ['pendingDrivers'] });
      queryClient.invalidateQueries({ queryKey: ['drivers'] });
      queryClient.invalidateQueries({ queryKey: ['adminStats'] });
      queryClient.invalidateQueries({ queryKey: ['driver', driver.id] });
    });

    newConnection.on('DriverRejected', (driver: DriverEvent) => {
      console.log('Driver rejected:', driver);
      showToast({
        title: 'Driver rejected',
        message: `${driver.fullName || 'A driver'} was rejected.`,
      });
      queryClient.invalidateQueries({ queryKey: ['pendingDrivers'] });
      queryClient.invalidateQueries({ queryKey: ['drivers'] });
      queryClient.invalidateQueries({ queryKey: ['adminStats'] });
      queryClient.invalidateQueries({ queryKey: ['driver', driver.id] });
    });

    newConnection.on('DriverStatusChanged', (data: DriverEvent) => {
      console.log('Driver status changed:', data);
      queryClient.invalidateQueries({ queryKey: ['drivers'] });
      queryClient.invalidateQueries({ queryKey: ['adminStats'] });
      queryClient.invalidateQueries({ queryKey: ['driver', data.id] });
    });

    newConnection.on('DriverLocationUpdated', (data: LocationEvent) => {
      // This could be used for real-time map updates if needed
      console.log('Driver location updated:', data);
    });

    // Connection state change handlers
    newConnection.onclose(() => {
      setConnectionState(signalR.HubConnectionState.Disconnected);
    });

    newConnection.onreconnecting(() => {
      setConnectionState(signalR.HubConnectionState.Reconnecting);
    });

    newConnection.onreconnected(() => {
      setConnectionState(signalR.HubConnectionState.Connected);
    });

    // Start connection
    newConnection.start()
      .then(() => {
        console.log('SignalR Connected to Admin Hub');
        setConnectionState(signalR.HubConnectionState.Connected);
        // Join admin room
        newConnection.invoke('JoinAdminRoom').catch((e: Error) => console.error(e));
      })
      .catch((err: Error) => {
        console.error('SignalR Connection Error:', err);
        setConnectionState(signalR.HubConnectionState.Disconnected);
      });

    setConnection(newConnection);

    // Cleanup on unmount
    return () => {
      if (toastTimeoutRef.current) {
        window.clearTimeout(toastTimeoutRef.current);
      }
      if (newConnection) {
        newConnection.stop();
      }
    };
  }, [queryClient]);

  return (
    <SignalRContext.Provider
      value={{
        connection,
        connectionState,
        isConnected: connectionState === signalR.HubConnectionState.Connected,
      }}
    >
      {children}

      {toast && (
        <div className="fixed bottom-4 right-4 z-50 max-w-sm">
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-gray-900">{toast.title}</p>
                <p className="text-sm text-gray-600">{toast.message}</p>
              </div>
              <button
                type="button"
                className="text-gray-400 hover:text-gray-600"
                onClick={() => setToast(null)}
                aria-label="Dismiss notification"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}
    </SignalRContext.Provider>
  );
}

// Hook for subscribing to specific driver updates
export function useDriverUpdates(driverId: string | undefined) {
  const { connection, isConnected } = useSignalR();

  useEffect(() => {
    if (!connection || !isConnected || !driverId) return;

    // Join driver-specific room for detailed updates
    connection.invoke('JoinDriverRoom', driverId).catch((e: Error) => console.error(e));

    return () => {
      // Leave driver room on cleanup
      connection.invoke('LeaveDriverRoom', driverId).catch((e: Error) => console.error(e));
    };
  }, [connection, isConnected, driverId]);
}
