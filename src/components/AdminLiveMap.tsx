import { useEffect, useMemo, useState } from 'react';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import L, { type LatLngBoundsExpression } from 'leaflet';
import 'leaflet.heat';
import { useQuery } from '@tanstack/react-query';
import { getDrivers, getLiveRides } from '../api';
import { useSignalR } from '../context/SignalRContext';

type DriverLocation = {
  latitude: number;
  longitude: number;
  updatedAt: number;
};

type LocationEvent = {
  driverId: string;
  latitude: number;
  longitude: number;
};

const availableIcon = L.divIcon({
  className: '',
  html: '<div style="width:10px;height:10px;border-radius:9999px;background:#22c55e;border:2px solid white;box-shadow:0 0 0 2px rgba(0,0,0,0.25)"></div>',
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});

const engagedIcon = L.divIcon({
  className: '',
  html: '<div style="width:10px;height:10px;border-radius:9999px;background:#ef4444;border:2px solid white;box-shadow:0 0 0 2px rgba(0,0,0,0.25)"></div>',
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});

function FitToMarkers({ bounds }: { bounds: LatLngBoundsExpression | null }) {
  const map = useMap();

  useEffect(() => {
    if (!bounds) return;
    map.fitBounds(bounds, { padding: [24, 24], maxZoom: 13 });
  }, [bounds, map]);

  return null;
}

function SetView({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();

  useEffect(() => {
    map.setView(center, zoom, { animate: true });
  }, [center[0], center[1], zoom, map]);

  return null;
}

function HeatLayer({ points }: { points: Array<[number, number, number]> }) {
  const map = useMap();

  useEffect(() => {
    if (!points || points.length === 0) return;

    // Zoom-reactive radius: smaller dots at higher zoom, larger at lower zoom
    const currentZoom = map.getZoom();
    const baseRadius = 26;
    const zoomFactor = 0.2;
    const adjustedRadius = baseRadius * (1 + (12 - currentZoom) * zoomFactor);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const heat = (L as any).heatLayer(points, {
      radius: Math.max(10, Math.min(50, adjustedRadius)),
      blur: 18,
      maxZoom: 14,
      // Pure Red (#FF0000) gradient
      gradient: {
        0.2: '#FF6666',
        0.4: '#FF4444',
        0.6: '#FF2222',
        0.8: '#FF0000',
        1.0: '#FF0000',
      },
    });

    heat.addTo(map);

    // Update heatmap on zoom change
    const onZoom = () => {
      const newZoom = map.getZoom();
      const newRadius = baseRadius * (1 + (12 - newZoom) * zoomFactor);
      heat.setOptions({ radius: Math.max(10, Math.min(50, newRadius)) });
      heat.redraw();
    };

    map.on('zoomend', onZoom);

    return () => {
      map.off('zoomend', onZoom);
      map.removeLayer(heat);
    };
  }, [map, points]);

  return null;
}

export default function AdminLiveMap({
  center,
  zoom = 12,
  autoFit = false,
}: {
  center: [number, number];
  zoom?: number;
  autoFit?: boolean;
}) {
  const { connection, isConnected } = useSignalR();
  const [locationsByDriverId, setLocationsByDriverId] = useState<Record<string, DriverLocation>>({});
  const [heatMode, setHeatMode] = useState<'supply' | 'demand'>('supply');

  const { data: driversResponse } = useQuery({
    queryKey: ['drivers', { page: 1, pageSize: 200, isActive: true }],
    queryFn: () => getDrivers({ page: 1, pageSize: 200, isActive: true }),
    refetchInterval: 30000,
  });

  const { data: liveRides } = useQuery({
    queryKey: ['adminLiveRides', { limit: 100 }],
    queryFn: () => getLiveRides({ limit: 100 }),
    refetchInterval: 15000,
  });

  useEffect(() => {
    if (!connection) return;

    const onLocation = (data: LocationEvent) => {
      setLocationsByDriverId((prev) => ({
        ...prev,
        [data.driverId]: {
          latitude: data.latitude,
          longitude: data.longitude,
          updatedAt: Date.now(),
        },
      }));
    };

    connection.on('DriverLocationUpdated', onLocation);
    return () => {
      connection.off('DriverLocationUpdated', onLocation);
    };
  }, [connection]);

  const drivers = driversResponse?.drivers ?? [];

  const availableMarkers = useMemo(() => {
    return drivers
      .filter((d) => String(d.status).toLowerCase() === 'online')
      .map((d) => {
        const loc = locationsByDriverId[d.id];
        if (!loc) return null;
        return {
          id: d.id,
          position: [loc.latitude, loc.longitude] as [number, number],
        };
      })
      .filter(Boolean) as Array<{ id: string; position: [number, number] }>;
  }, [drivers, locationsByDriverId]);

  const engagedMarkers = useMemo(() => {
    return drivers
      .filter((d) => {
        const s = String(d.status).toLowerCase();
        return s === 'busy' || s === 'on_trip';
      })
      .map((d) => {
        const loc = locationsByDriverId[d.id];
        if (!loc) return null;
        return {
          id: d.id,
          position: [loc.latitude, loc.longitude] as [number, number],
        };
      })
      .filter(Boolean) as Array<{ id: string; position: [number, number] }>;
  }, [drivers, locationsByDriverId]);

  const bounds = useMemo<LatLngBoundsExpression | null>(() => {
    const all = [...availableMarkers, ...engagedMarkers];
    if (all.length === 0) return null;
    const latlngs = all.map((m) => L.latLng(m.position[0], m.position[1]));
    const b = L.latLngBounds(latlngs);
    return b.isValid() ? (b as LatLngBoundsExpression) : null;
  }, [availableMarkers, engagedMarkers]);

  const heatPoints = useMemo(() => {
    if (heatMode === 'demand') {
      const points = (liveRides?.rides ?? [])
        .filter((r) => Number.isFinite(r.originLatitude) && Number.isFinite(r.originLongitude))
        .map((r) => [r.originLatitude, r.originLongitude, 1] as [number, number, number]);
      return points;
    }

    // Supply heat (proxy): engaged drivers contribute more weight.
    const engaged = engagedMarkers.map((m) => [m.position[0], m.position[1], 1] as [number, number, number]);
    const available = availableMarkers.map((m) => [m.position[0], m.position[1], 0.4] as [number, number, number]);
    return [...available, ...engaged];
  }, [availableMarkers, engagedMarkers, heatMode, liveRides?.rides]);

  return (
    <div className="admin-live-map isolate relative w-full h-[320px] md:h-[360px] lg:h-[380px] overflow-hidden border border-gray-200">
      <MapContainer center={center} zoom={zoom} scrollWheelZoom className="w-full h-full">
        <TileLayer
          attribution='&copy; OpenStreetMap contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <SetView center={center} zoom={zoom} />
        {autoFit && <FitToMarkers bounds={bounds} />}
        <HeatLayer points={heatPoints} />

        {availableMarkers.map((m) => (
          <Marker key={`avail_${m.id}`} position={m.position} icon={availableIcon} />
        ))}

        {engagedMarkers.map((m) => (
          <Marker key={`eng_${m.id}`} position={m.position} icon={engagedIcon} />
        ))}
      </MapContainer>

      <div className="absolute top-3 left-3 bg-white/90 backdrop-blur px-3 py-2 border border-gray-200">
        <div className="text-xs font-semibold text-gray-900 uppercase">Live Map</div>
        <div className="mt-1 space-y-1 text-xs text-gray-700">
          <div className="flex items-center gap-2">
            <span className="inline-block w-2.5 h-2.5 bg-green-500" />
            Available drivers
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-block w-2.5 h-2.5 bg-[#FF0000]" />
            Engaged trips
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-block w-2.5 h-2.5 bg-[#FF0000]" />
            Heat: {heatMode === 'demand' ? 'Demand' : 'Supply'}
          </div>
        </div>
      </div>

      <div className="absolute top-3 right-3 bg-white/90 backdrop-blur border border-gray-200 p-1">
        <div className="inline-flex items-center">
          <button
            type="button"
            onClick={() => setHeatMode('demand')}
            className={`px-3 py-1.5 text-xs font-semibold transition-colors ${
              heatMode === 'demand' ? 'bg-[#FF0000] text-white' : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            Demand
          </button>
          <button
            type="button"
            onClick={() => setHeatMode('supply')}
            className={`px-3 py-1.5 text-xs font-semibold transition-colors ${
              heatMode === 'supply' ? 'bg-[#FF0000] text-white' : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            Supply
          </button>
        </div>
      </div>

      <div className="absolute bottom-3 left-3">
        <div className="inline-flex items-center gap-2 px-3 py-2 bg-white/90 backdrop-blur border border-gray-200 text-xs text-gray-700">
          <span className={`w-2 h-2 ${isConnected ? 'bg-green-500' : 'bg-yellow-500 animate-pulse'}`} />
          {isConnected ? 'Receiving live updates' : 'Waiting for live updates'}
        </div>
      </div>
    </div>
  );
}
