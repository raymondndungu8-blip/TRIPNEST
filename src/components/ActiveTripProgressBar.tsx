import React from 'react';
import { UserCheck, MapPin, Navigation, Trophy } from 'lucide-react';

interface ActiveTripProgressBarProps {
  status: 'searching' | 'accepted' | 'en_route' | 'completed' | 'cancelled' | 'rejected_by_all' | undefined;
  driverArrived?: boolean;
  isStarted?: boolean;
  className?: string;
}

export default function ActiveTripProgressBar({
  status,
  driverArrived = false,
  isStarted = false,
  className = "",
}: ActiveTripProgressBarProps) {
  // Determine current active step (0-indexed)
  // Step 0: Confirmed/Accepted
  // Step 1: Arrived
  // Step 2: In Transit (En Route)
  // Step 3: Completed
  let activeStep = 0;

  if (status === 'completed') {
    activeStep = 3;
  } else if (status === 'en_route' && isStarted) {
    activeStep = 2;
  } else if (driverArrived || status === 'accepted' && driverArrived) {
    activeStep = 1;
  } else if (status === 'accepted' || status === 'en_route') {
    activeStep = 0;
  } else {
    activeStep = -1; // Default or searching phase
  }

  const steps = [
    { label: 'MATCHED', desc: 'Secure Taxi', icon: UserCheck },
    { label: 'ARRIVED', desc: 'Driver at Lobby', icon: MapPin },
    { label: 'IN TRANSIT', desc: 'Live Journey', icon: Navigation },
    { label: 'COMPLETED', desc: 'Arrived Safe', icon: Trophy },
  ];

  if (status === 'searching' || !status) {
    return null; // Don't render if we are still searching
  }

  return (
    <div id="active-trip-progress-container" className={`bg-[#121318]/95 border border-zinc-850/80 rounded-2xl p-4 shadow-xl backdrop-blur-md ${className}`}>
      {/* Header Info */}
      <div className="flex justify-between items-center mb-3">
        <span className="text-[8px] font-mono font-black text-primary tracking-widest uppercase">
          LIVE TRANSIT MATRIX TRACKER
        </span>
        <span className="text-[10px] font-black text-white font-sans bg-[#007AFF]/15 text-[#007AFF] px-2.5 py-0.5 rounded-full uppercase tracking-wider">
          {activeStep === 0 && "Driver Commiting Route"}
          {activeStep === 1 && "Arrived & Waiting Inside Lobby"}
          {activeStep === 2 && "Active Secure Cruise"}
          {activeStep === 3 && "Transit Safely Completed"}
        </span>
      </div>

      {/* Modern Progress Line/Dots Layout */}
      <div className="relative flex items-center justify-between mt-3.5 px-2">
        {/* Connection line background */}
        <div className="absolute left-6 right-6 top-1/2 -translate-y-1/2 h-[3px] bg-zinc-800 rounded-full z-0" />
        
        {/* Glowing Filled line */}
        <div 
          className="absolute left-6 top-1/2 -translate-y-1/2 h-[3px] bg-gradient-to-r from-[#007AFF] to-[#10B981] rounded-full z-0 transition-all duration-700 ease-out shadow-[0_0_8px_rgba(0,122,255,0.4)]"
          style={{ 
            width: activeStep <= 0 ? '0%' : activeStep === 1 ? '33.33%' : activeStep === 2 ? '66.66%' : '100%',
            right: 'auto'
          }}
        />

        {steps.map((step, idx) => {
          const StepIcon = step.icon;
          const isCompleted = idx < activeStep;
          const isActive = idx === activeStep;
          const isPending = idx > activeStep;

          return (
            <div key={idx} className="flex flex-col items-center relative z-10">
              {/* Outer icon circle */}
              <div 
                className={`w-9 h-9 rounded-full flex items-center justify-center transition-all duration-500 border-2 ${
                  isCompleted 
                    ? 'bg-emerald-500 border-emerald-400 text-black shadow-[0_0_12px_rgba(16,185,129,0.25)]' 
                    : isActive 
                      ? 'bg-[#007AFF] border-white text-white shadow-[0_0_14px_rgba(0,122,255,0.5)] scale-110' 
                      : 'bg-zinc-950 border-zinc-800 text-zinc-500'
                }`}
              >
                <StepIcon className={`w-4 h-4 ${isActive ? 'animate-pulse' : ''}`} />
              </div>

              {/* Step info label below */}
              <span className={`text-[8px] font-black tracking-wider transition-colors duration-300 uppercase mt-2 ${
                isActive ? 'text-white' : isCompleted ? 'text-emerald-400 font-bold' : 'text-zinc-500'
              }`}>
                {step.label}
              </span>
              <span className="text-[7.5px] font-mono text-zinc-500/80 font-medium scale-90 leading-none mt-0.5 whitespace-nowrap">
                {step.desc}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
