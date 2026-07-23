import React, { useMemo } from 'react';
import { APIProvider, Map, AdvancedMarker, Pin, Polyline, useMap } from '@vis.gl/react-google-maps';

const API_KEY =
  process.env.GOOGLE_MAPS_PLATFORM_KEY ||
  (import.meta as any).env?.VITE_GOOGLE_MAPS_PLATFORM_KEY ||
  (globalThis as any).GOOGLE_MAPS_PLATFORM_KEY ||
  '';

const hasValidKey = Boolean(API_KEY) && API_KEY !== 'YOUR_API_KEY' && API_KEY.trim() !== '';

const DEFAULT_CENTER = { lat: -1.2921, lng: 36.8219 };

export interface MapMarker {
  lat: number;
  lng: number;
  label?: string;
}

interface VirtualMapProps {
  height?: string;
  zoom?: number;
  center?: MapMarker;
  pickup?: MapMarker | null;
  destination?: MapMarker | null;
  driverLocation?: (MapMarker & { heading?: number }) | null;
  routePath?: { lat: number; lng: number }[];
  interactive?: boolean;
  className?: string;
  hideControls?: boolean;
}

function MapContent({ pickup, destination, driverLocation, routePath }: {
  pickup?: MapMarker | null;
  destination?: MapMarker | null;
  driverLocation?: (MapMarker & { heading?: number }) | null;
  routePath?: { lat: number; lng: number }[];
}) {
  const map = useMap();

  React.useEffect(() => {
    if (map && destination) {
      map.panTo({ lat: destination.lat, lng: destination.lng });
    }
  }, [map, destination]);

  return (
    <>
      {pickup && (
        <AdvancedMarker position={{ lat: pickup.lat, lng: pickup.lng }}>
          <div className="relative flex flex-col items-center">
            <div className="w-3 h-3 bg-[#007AFF] rounded-full border-2 border-white shadow-[0_0_12px_rgba(0,122,255,0.6)]" />
            <span className="text-[8px] font-black text-white mt-0.5 whitespace-nowrap bg-zinc-950/80 px-1.5 py-0.5 rounded">
              {pickup.label || 'Pickup'}
            </span>
          </div>
        </AdvancedMarker>
      )}

      {destination && (
        <AdvancedMarker position={{ lat: destination.lat, lng: destination.lng }}>
          <div className="relative flex flex-col items-center">
            <div className="w-3 h-3 bg-zinc-900 rounded-full border-2 border-white shadow-lg" />
            <span className="text-[8px] font-black text-white mt-0.5 whitespace-nowrap bg-zinc-950/80 px-1.5 py-0.5 rounded">
              {destination.label || 'Dropoff'}
            </span>
          </div>
        </AdvancedMarker>
      )}

      {driverLocation && (
        <AdvancedMarker
          position={{ lat: driverLocation.lat, lng: driverLocation.lng }}
        >
          <div
            className="flex items-center justify-center transition-all duration-300"
            style={{ transform: `rotate(${driverLocation.heading || 0}deg)` }}
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
              <rect x="4" y="7" width="16" height="10" rx="3" fill="#007AFF" stroke="white" strokeWidth="1.5" />
              <rect x="6" y="9" width="4" height="3" rx="1" fill="rgba(255,255,255,0.3)" />
              <rect x="14" y="9" width="4" height="3" rx="1" fill="rgba(255,255,255,0.3)" />
              <circle cx="8" cy="17" r="1.5" fill="white" />
              <circle cx="16" cy="17" r="1.5" fill="white" />
            </svg>
          </div>
        </AdvancedMarker>
      )}

      {routePath && routePath.length > 1 && (
        <Polyline
          path={routePath}
          strokeColor="#007AFF"
          strokeOpacity={0.7}
          strokeWeight={4}
        />
      )}
    </>
  );
}

export default function VirtualMap({
  height = '100%',
  zoom = 14,
  center = DEFAULT_CENTER,
  pickup,
  destination,
  driverLocation,
  routePath,
  interactive = true,
  className = '',
  hideControls = false,
}: VirtualMapProps) {
  const darkMapStyle = useMemo(() => ({
    styles: [
      { elementType: 'geometry', stylers: [{ color: '#0A0B0F' }] },
      { elementType: 'labels.text.fill', stylers: [{ color: '#8B909F' }] },
      { elementType: 'labels.text.stroke', stylers: [{ color: '#0A0B0F' }] },
      { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#1A1C24' }] },
      { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#2C2E36' }] },
      { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#8B909F' }] },
      { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0D111A' }] },
      { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#3B4B6B' }] },
      { featureType: 'poi', elementType: 'geometry', stylers: [{ color: '#12131A' }] },
      { featureType: 'poi', elementType: 'labels.text.fill', stylers: [{ color: '#6B7280' }] },
      { featureType: 'transit', elementType: 'geometry', stylers: [{ color: '#1A1C24' }] },
      { featureType: 'administrative', elementType: 'geometry.stroke', stylers: [{ color: '#2C2E36' }] },
      { featureType: 'administrative', elementType: 'labels.text.fill', stylers: [{ color: '#6B7280' }] },
    ] as google.maps.MapTypeStyle[],
  }), []);

  if (!hasValidKey) {
    return (
      <div className={`relative w-full bg-[#0A0B0F] overflow-hidden select-none ${className}`} style={{ height }}>
        <svg className="w-full h-full object-cover" viewBox="0 0 600 500" preserveAspectRatio="xMidYMid slice">
          <rect width="600" height="500" fill="#0A0B0F" />
          <path d="M -20,440 Q 80,430 140,330 T 170,190 Q 180,100 130,30 T 40,-30" fill="none" stroke="#1A1C24" strokeWidth="2" />
          <path d="M -20,120 Q 280,110 620,120" fill="none" stroke="#1A1C24" strokeWidth="2" />
          <path d="M -20,330 Q 280,310 620,330" fill="none" stroke="#1A1C24" strokeWidth="2" />
          <line x1="310" y1="-20" x2="310" y2="520" stroke="#1A1C24" strokeWidth="2" />
          <line x1="490" y1="-20" x2="490" y2="520" stroke="#1A1C24" strokeWidth="2" />
          <line x1="80" y1="-20" x2="80" y2="520" stroke="#1A1C24" strokeWidth="1" />
          <line x1="190" y1="-20" x2="190" y2="520" stroke="#1A1C24" strokeWidth="1" />
          <line x1="410" y1="-20" x2="410" y2="520" stroke="#1A1C24" strokeWidth="1" />
        </svg>

        {pickup && (
          <div className="absolute" style={{ left: '35%', top: '45%' }}>
            <div className="flex flex-col items-center">
              <div className="w-3 h-3 bg-[#007AFF] rounded-full border-2 border-white shadow-[0_0_12px_rgba(0,122,255,0.6)]" />
            </div>
          </div>
        )}
        {destination && (
          <div className="absolute" style={{ left: '65%', top: '35%' }}>
            <div className="flex flex-col items-center">
              <div className="w-3 h-3 bg-zinc-900 rounded-full border-2 border-white shadow-lg" />
            </div>
          </div>
        )}
        {driverLocation && (
          <div className="absolute animate-pulse" style={{ left: '50%', top: '55%' }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
              <rect x="4" y="7" width="16" height="10" rx="3" fill="#007AFF" stroke="white" strokeWidth="1.5" />
              <rect x="6" y="9" width="4" height="3" rx="1" fill="rgba(255,255,255,0.3)" />
              <rect x="14" y="9" width="4" height="3" rx="1" fill="rgba(255,255,255,0.3)" />
            </svg>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`relative w-full ${className}`} style={{ height }}>
      <APIProvider apiKey={API_KEY} version="weekly">
        <Map
          defaultCenter={center}
          defaultZoom={zoom}
          mapId="DEMO_MAP_ID"
          style={{ width: '100%', height: '100%' }}
          gestureHandling={interactive ? 'greedy' : 'none'}
          disableDefaultUI={hideControls}
          colorScheme="DARK"
        >
          <MapContent
            pickup={pickup}
            destination={destination}
            driverLocation={driverLocation}
            routePath={routePath}
          />
        </Map>
      </APIProvider>
    </div>
  );
}
