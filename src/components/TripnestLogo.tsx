import React from 'react';

interface TripnestLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  variant?: 'icon' | 'capsule' | 'full';
  glow?: boolean;
}

export default function TripnestLogo({
  className = '',
  size = 'md',
  showText = false,
  variant = 'icon',
  glow = true,
}: TripnestLogoProps) {
  // Size metrics mapping
  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
    xl: 'w-20 h-20',
  };

  const finalIconClass = className || sizeClasses[size];

  // Fluid high-fidelity dual-wings modern N SVG representation matching the provided design specs
  const renderSvg = () => (
    <svg 
      viewBox="0 0 100 100" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg" 
      className={`w-full h-full select-none ${glow ? 'drop-shadow-[0_0_10px_rgba(0,162,255,0.45)]' : ''}`}
    >
      <defs>
        {/* Exact Electric Blue to Cyan gradient specifications from the brand sheet */}
        <linearGradient id="tripnest-grad-1" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#0055FF" />
          <stop offset="50%" stopColor="#00A2FF" />
          <stop offset="100%" stopColor="#00F2FE" />
        </linearGradient>
        <linearGradient id="tripnest-grad-2" x1="20%" y1="80%" x2="80%" y2="20%">
          <stop offset="0%" stopColor="#0033CC" />
          <stop offset="40%" stopColor="#0055FF" />
          <stop offset="100%" stopColor="#00F2FE" />
        </linearGradient>
        <linearGradient id="tripnest-grad-center" x1="0%" y1="50%" x2="100%" y2="50%">
          <stop offset="0%" stopColor="#0055FF" />
          <stop offset="100%" stopColor="#00F2FE" />
        </linearGradient>
        {/* Glow filtration for backing light */}
        <filter id="ambient-glow" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="6" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>

      {/* Cybernetic ambient backing glows */}
      {glow && (
        <g opacity="0.35" filter="url(#ambient-glow)">
          {/* Main logo body glow */}
          <path 
            d="M 30,70 C 20,70 16,51 26,33 C 36,15 52,11 53,13 Q 51,15 41,32 C 31,49 36,70 30,70 Z" 
            fill="url(#tripnest-grad-1)" 
          />
          <path 
            d="M 70,30 C 80,30 84,49 74,67 C 64,85 48,89 47,87 Q 49,85 59,68 C 69,51 64,30 70,30 Z" 
            fill="url(#tripnest-grad-2)" 
          />
          {/* Center core connection glow */}
          <path
            d="M 30,70 Q 50,50 70,30 C 65,35 35,65 30,70 Z"
            fill="url(#tripnest-grad-center)"
          />
        </g>
      )}

      {/* Back layer: Central connecting sleek diagonal ribbon */}
      <path 
        d="M 30,70 C 35,65 45,55 50,50 C 55,45 65,35 70,30 C 62,35 38,65 30,70 Z" 
        fill="url(#tripnest-grad-center)"
        opacity="0.85"
      />

      {/* Left wing curve ribbon: sweeps upwards-right and arcs beautifully down-left */}
      <path 
        d="M 30,70 C 20,70 16,51 26,33 C 36,15 52,11 53,13 Q 51,15 41,32 C 31,49 36,70 30,70 Z" 
        fill="url(#tripnest-grad-1)" 
      />

      {/* Right wing curve ribbon: sweeps downwards-left and arcs beautifully up-right */}
      <path 
        d="M 70,30 C 80,30 84,49 74,67 C 64,85 48,89 47,87 Q 49,85 59,68 C 69,51 64,30 70,30 Z" 
        fill="url(#tripnest-grad-2)" 
      />

      {/* Highlights/Overlay for pristine 3D ribbon shading */}
      <path 
        d="M 28,38 C 34,26 44,20 48,18 Q 44,22 36,36 C 32,44 32,52 30,62 Q 29,50 28,38 Z" 
        fill="#FFFFFF" 
        opacity="0.15" 
      />
    </svg>
  );

  // Capsule variant matches the "Tripnest Minimal Icon" in rounded card with electric-blue glow box
  if (variant === 'capsule') {
    return (
      <div className="flex items-center justify-center bg-[#070b13] border border-[#0055FF]/30 rounded-2xl shadow-[0_0_18px_rgba(0,85,255,0.22)] p-2 w-11 h-11 shrink-0 relative overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-tr from-[#0055FF]/5 to-transparent opacity-50 group-hover:opacity-100 transition-opacity duration-300" />
        <div className="w-8 h-8 relative z-10">
          {renderSvg()}
        </div>
      </div>
    );
  }

  if (variant === 'full' || showText) {
    return (
      <div className="flex items-center gap-3">
        {/* Minimal icon representation */}
        <div className="flex items-center justify-center bg-[#070b13]/80 border border-[#0055FF]/20 rounded-xl shadow-[0_0_12px_rgba(0,122,255,0.15)] p-1.5 w-9 h-9 shrink-0">
          <div className="w-6 h-6">
            {renderSvg()}
          </div>
        </div>

        {/* Brand visual typographic display */}
        <div className="flex flex-col select-none leading-none">
          <span className="font-sans font-black tracking-[0.2em] text-[15px] text-[#F9FAFB] uppercase leading-none">
            TRIPNEST
          </span>
          <span className="text-[7.5px] font-bold text-[#00F2FE]/80 tracking-[0.1em] mt-1 leading-none uppercase">
            Smart Travel Coord
          </span>
        </div>
      </div>
    );
  }

  // Default: Pure vector emblem glyph
  return (
    <div className={finalIconClass}>
      {renderSvg()}
    </div>
  );
}
