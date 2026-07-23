import React, { useState, useEffect, useRef } from 'react';
import { Navigation, Compass, Clock } from 'lucide-react';

interface ThreeDMapProps {
  pickup?: string;
  destination?: string;
  isActive?: boolean;
  status?: string;
  driverName?: string;
  className?: string;
}

export default function ThreeDMap({
  pickup = 'Westlands, Nairobi',
  destination = '',
  status = 'idle',
  driverName = 'Marcus',
  className = 'min-h-[300px] h-[360px]',
}: ThreeDMapProps) {
  const [progress, setProgress] = useState(0.15);
  const requestRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);

  const routePoints = {
    start: { x: 80, y: 320 },
    pickup: { x: 200, y: 180 },
    destination: { x: 320, y: 280 },
  };

  const structures = [
    { x: 35, y: 35, w: 42, d: 32, h: 100, color: '#0055FF' },
    { x: 315, y: 50, w: 50, d: 40, h: 120, color: '#3B82F6' },
    { x: 135, y: 325, w: 32, d: 32, h: 70, color: '#00F2FE' },
  ];

  const getVehiclePosition = () => {
    const isEnRoute = status === 'en_route';
    const p1 = isEnRoute ? routePoints.pickup : routePoints.start;
    const p2 = isEnRoute ? routePoints.destination : routePoints.pickup;
    const cx = (p1.x + p2.x) / 2 + 30;
    const cy = (p1.y + p2.y) / 2 - 40;
    const t = progress;
    const mt = 1 - t;
    const x = mt * mt * p1.x + 2 * mt * t * cx + t * t * p2.x;
    const y = mt * mt * p1.y + 2 * mt * t * cy + t * t * p2.y;
    const nextT = Math.min(1, t + 0.01);
    const nMt = 1 - nextT;
    const nx = nMt * nMt * p1.x + 2 * nMt * nextT * cx + nextT * nextT * p2.x;
    const ny = nMt * nMt * p1.y + 2 * nMt * nextT * cy + nextT * nextT * p2.y;
    return { x, y, heading: Math.atan2(ny - y, nx - x) * (180 / Math.PI) || 0 };
  };

  const vehiclePos = getVehiclePosition();

  useEffect(() => {
    const update = (time: number) => {
      if (lastTimeRef.current !== null) {
        const delta = (time - lastTimeRef.current) / 1000;
        setProgress(prev => {
          let next = prev + 0.003;
          if (next > 1.0) next = 0.0;
          return next;
        });
      }
      lastTimeRef.current = time;
      requestRef.current = requestAnimationFrame(update);
    };
    requestRef.current = requestAnimationFrame(update);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, []);

  return (
    <div className={`bg-[#0A0B0F] overflow-hidden relative select-none ${className}`}>
      <div className="absolute inset-0 bg-gradient-to-b from-[#0A0B0F]/80 to-transparent pointer-events-none z-10" />

      {/* 3D isometric view */}
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="w-[500px] h-[500px] relative flex-shrink-0" style={{ transform: 'perspective(700px) rotateX(55deg) rotateZ(-20deg) scale(1.1)' }}>
          {/* Base plate */}
          <div className="absolute inset-0 rounded-[50px]" style={{ backgroundColor: '#050a1b', boxShadow: 'inset 0 0 35px rgba(0,0,0,0.85)' }} />

          <svg className="absolute inset-0 w-full h-full pointer-events-none z-10" viewBox="0 0 400 400">
            <defs>
              <linearGradient id="route-grad-3d" x1="0%" y1="100%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#0055FF" />
                <stop offset="100%" stopColor="#00F2FE" />
              </linearGradient>
            </defs>

            {/* Grid */}
            <pattern id="grid-3d" width="30" height="30" patternUnits="userSpaceOnUse">
              <path d="M 30 0 L 0 0 0 30" fill="none" stroke="#101b3a" strokeWidth="0.5" opacity="0.3" />
            </pattern>
            <rect width="100%" height="100%" fill="url(#grid-3d)" rx="40" />

            {/* Route path */}
            <path d="M 80,320 Q 145,230 200,180 Q 260,230 320,280" fill="none" stroke="url(#route-grad-3d)" strokeWidth="4" strokeLinecap="round" opacity="0.8" />
            <path d="M 80,320 Q 145,230 200,180 Q 260,230 320,280" fill="none" stroke="white" strokeWidth="1" strokeDasharray="4 6" opacity="0.5" />

            {/* Buildings */}
            {structures.map((s, idx) => (
              <g key={idx}>
                <polygon points={`${s.x},${s.y + s.d} ${s.x + s.w},${s.y + s.d} ${s.x + s.w + s.h * 0.12},${s.y + s.d - s.h * 0.18} ${s.x + s.h * 0.12},${s.y + s.d - s.h * 0.18}`}
                  fill={`${s.color}22`} stroke={`${s.color}55`} strokeWidth="0.8" />
                <polygon points={`${s.x + s.w},${s.y} ${s.x + s.w},${s.y + s.d} ${s.x + s.w + s.h * 0.12},${s.y + s.d - s.h * 0.18} ${s.x + s.w + s.h * 0.12},${s.y - s.h * 0.18}`}
                  fill={`${s.color}11`} stroke={`${s.color}55`} strokeWidth="0.8" />
                <rect x={s.x + s.h * 0.12} y={s.y - s.h * 0.18} width={s.w} height={s.d}
                  fill="#0c1c44" stroke={`${s.color}55`} strokeWidth="0.8" />
              </g>
            ))}

            {/* Pickup dot */}
            <circle cx={routePoints.pickup.x} cy={routePoints.pickup.y} r="5" fill="#007AFF" stroke="white" strokeWidth="2" />
            {/* Destination dot */}
            <circle cx={routePoints.destination.x} cy={routePoints.destination.y} r="5" fill="#10B981" stroke="white" strokeWidth="2" />
          </svg>

          {/* Vehicle */}
          <div className="absolute z-20" style={{ left: `${vehiclePos.x}px`, top: `${vehiclePos.y}px`, transform: 'translate(-50%, -50%)' }}>
            <div className="bg-[#007AFF] border-2 border-white rounded-lg p-1 shadow-[0_0_20px_rgba(0,122,255,0.5)]">
              <Navigation className="w-5 h-5 text-white" style={{ transform: `rotate(${vehiclePos.heading}deg)` }} />
            </div>
          </div>
        </div>
      </div>

      {/* Bottom ETA bar */}
      <div className="absolute bottom-0 left-0 right-0 z-20 bg-gradient-to-t from-[#0A0B0F] via-[#0A0B0F]/95 to-transparent p-4 pt-8">
        <div className="flex items-center justify-between bg-zinc-950/90 border border-zinc-800 rounded-xl px-4 py-2.5">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#007AFF]" />
            <span className="text-sm font-bold text-white">4 min</span>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-zinc-400">
            <Compass className="w-3 h-3" />
            <span>{driverName} • {pickup}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
