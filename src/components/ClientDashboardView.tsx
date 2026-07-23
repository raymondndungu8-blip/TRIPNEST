import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Compass, History, Smartphone, User, Star, Shield, HelpCircle, 
  MapPin, CheckCircle, SmartphoneIcon, Laptop, CornerRightDown, Map, Heart, LogOut,
  Sparkles, Layers, Sliders, DollarSign, Activity, Settings, UserCheck, Bell, ShieldAlert,
  MessageSquare, UserX, AlertTriangle, ArrowRight, Bookmark, Gift, Info, RefreshCw, Zap, X, Eye, Menu, ChevronRight,
  Calendar, CreditCard
} from 'lucide-react';
import { Passenger, Driver, EventItem, Booking, PaymentMethod } from '../types';
import PagesRenderer from './PagesRenderer';

interface ClientDashboardViewProps {
  passenger: Passenger;
  setPassenger: (p: Passenger) => void;
  drivers: Driver[];
  toggleFavoriteDriver: (id: string) => void;
  events: EventItem[];
  bookings: Booking[];
  setBookings: React.Dispatch<React.SetStateAction<Booking[]>>;
  activeBooking: Booking | undefined;
  simulateCompleteTrip: (id: string) => void;
  cancelActiveTrip: (id: string) => void;
  ratingDriverId: string | null;
  setRatingDriverId: (id: string | null) => void;
  ratingStars: number;
  setRatingStars: (stars: number) => void;
  ratingFavorite: boolean;
  setRatingFavorite: (fav: boolean) => void;
  submitRating: () => void;
  resetDemoState?: () => void;
  onSwitchToDriver?: () => void;
}

export default function ClientDashboardView({
  passenger,
  setPassenger,
  drivers,
  toggleFavoriteDriver,
  events,
  bookings,
  setBookings,
  activeBooking,
  simulateCompleteTrip,
  cancelActiveTrip,
  ratingDriverId,
  setRatingDriverId,
  ratingStars,
  setRatingStars,
  ratingFavorite,
  setRatingFavorite,
  submitRating,
  resetDemoState,
  onSwitchToDriver
}: ClientDashboardViewProps) {
  // Selected page state inside physical mobile emulator frame
  // Default to Page 8 if already registered, otherwise Page 1 (Welcome Splash Screen)
  const [activePageId, setActivePageId] = useState<number>(() => {
    return passenger.isRegistered ? 8 : 1;
  });

  // Navigate to Home screen when successfully authenticated/registered, or back to Welcome screen on log out
  React.useEffect(() => {
    if (passenger.isRegistered) {
      if (activePageId < 8) {
        setActivePageId(8); // Proceed to Map view
      }
    } else {
      setActivePageId(1); // Welcome splash screen
    }
  }, [passenger.isRegistered]);

  // Synchronize client page views dynamically based on the active booking's status
  React.useEffect(() => {
    if (!passenger.isRegistered) return; // Allow user to navigate welcome / login screens without state hijacking
    if (!activeBooking) return;
    
    if (activeBooking.status === 'searching') {
      setActivePageId(15); // Show searching sonar screen
    } else if (activeBooking.status === 'accepted') {
      if (activeBooking.driverArrived) {
        if (activePageId !== 18) {
          setActivePageId(18); // Driver Arrived Page
        }
      } else {
        if (activePageId !== 16 && activePageId !== 17 && activePageId !== 18) {
          setActivePageId(16); // Match confirmatory details
        }
      }
    } else if (activeBooking.status === 'en_route') {
      if (activeBooking.isStarted && activePageId !== 19) {
        setActivePageId(19); // Trip in Progress Page
      }
    } else if (activeBooking.status === 'completed') {
      if (activePageId !== 23) {
        setActivePageId(23); // Trip Completed Ratings Page
      }
    }
  }, [activeBooking?.status, activeBooking?.driverArrived, activeBooking?.isStarted]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[100dvh] w-full select-none text-left p-0 sm:p-6 animate-in fade-in duration-500">
      
      {/* High-End Smartphone Device Mockup Container */}
      <div className="relative w-full h-screen sm:h-[840px] max-w-none sm:max-w-[390px] rounded-none sm:rounded-[50px] border-0 sm:border-[12px] border-[#1C1E24] bg-zinc-950 shadow-none sm:shadow-[0_30px_70px_-10px_rgba(0,0,0,0.95)] flex flex-col overflow-hidden relative z-10 font-sans leading-none select-none">
        
        {/* Top Camera cutout / Sensor bar (Only visible on desktop/tablet views) */}
        <div className="hidden sm:flex absolute top-2 left-1/2 transform -translate-x-1/2 w-32 h-5 bg-zinc-900 rounded-full z-40 items-center justify-center">
          <div className="w-9 h-1 bg-black rounded-full mb-0.5" />
        </div>

        {/* Dynamic Mobile OS status panel inside application viewport */}
        <header className="flex items-center justify-between px-6 pt-5 pb-2.5 bg-[#090A0D] border-b border-zinc-905/30 shrink-0 z-30 select-none">
          <span className="text-[10px] font-black text-zinc-400 font-mono tracking-tight select-none">14:02</span>
          <div className="flex items-center gap-1.5 select-none">
            <span className="text-[9px] font-extrabold text-zinc-400 font-mono tracking-wider">TRIPNEST</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          </div>
        </header>

        {/* Content Switcher Frame injected inside Phone */}
        <div className="flex-grow overflow-hidden relative flex flex-col">
          <div className="flex-grow overflow-hidden relative">
            <PagesRenderer 
              pageNumber={activePageId}
              setPageNumber={setActivePageId}
              passenger={passenger}
              setPassenger={setPassenger}
              drivers={drivers}
              toggleFavoriteDriver={toggleFavoriteDriver}
              events={events}
              bookings={bookings}
              setBookings={setBookings}
              activeBooking={activeBooking}
              simulateCompleteTrip={simulateCompleteTrip}
              cancelActiveTrip={cancelActiveTrip}
              ratingDriverId={ratingDriverId}
              setRatingDriverId={setRatingDriverId}
              ratingStars={ratingStars}
              setRatingStars={setRatingStars}
              ratingFavorite={ratingFavorite}
              setRatingFavorite={setRatingFavorite}
              submitRating={submitRating}
              resetDemoState={resetDemoState}
            />
          </div>

          {/* Animated iOS Bottom Tab Bar (Visible once authenticated: pageNumber >= 8) */}
          {activePageId >= 8 && (
            <div className="bg-[#0B0C10] border-t border-zinc-900/60 px-2 py-2 shrink-0 z-40 flex items-center justify-around select-none">
              {[
                { id: 8, label: 'Explore', icon: Compass },
                { id: 45, label: 'Bookings', icon: Calendar },
                { id: 41, label: 'Events', icon: Sparkles },
                { id: 30, label: 'Wallet', icon: CreditCard },
                { id: 31, label: 'Settings', icon: Settings }
              ].map((tab) => {
                const Icon = tab.icon;
                const isUnderBookings = tab.id === 45 && (activePageId === 11 || activePageId === 9 || activePageId === 12 || activePageId === 15 || activePageId === 16 || activePageId === 17 || activePageId === 18 || activePageId === 19 || activePageId === 23);
                const isActive = activePageId === tab.id || isUnderBookings;
                return (
                  <button
                    key={tab.id}
                    onClick={() => {
                      if (tab.id === 8 && activeBooking) {
                        // If they have an active booking and tap Explore, redirect them to the relevant active trip page
                        if (activeBooking.status === 'searching') {
                          setActivePageId(15);
                        } else if (activeBooking.status === 'accepted') {
                          setActivePageId(activeBooking.driverArrived ? 18 : 16);
                        } else if (activeBooking.status === 'en_route') {
                          setActivePageId(19);
                        } else if (activeBooking.status === 'completed') {
                          setActivePageId(23);
                        }
                      } else {
                        setActivePageId(tab.id);
                      }
                    }}
                    className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-xl transition-all duration-300 outline-none cursor-pointer ${isActive ? 'text-[#007AFF]' : 'text-zinc-500 hover:text-zinc-200'}`}
                  >
                    <Icon className={`w-4 h-4 ${isActive ? 'scale-110 text-[#007AFF] stroke-[2.5px]' : 'stroke-[1.8px]'}`} />
                    <span className="text-[8.5px] font-bold tracking-tight">{tab.label}</span>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Simulated home indicator swipe line at the absolute bottom (Only on desktop style) */}
        <div className="hidden sm:block absolute bottom-2 left-1/2 transform -translate-x-1/2 w-28 h-1 bg-zinc-700/80 rounded-full z-30" />
      </div>

      {/* Subtle Outside Helper Actions Row for Simulation controls */}
      <div className="hidden sm:flex items-center justify-center gap-4 mt-4 text-[11px] font-semibold text-zinc-500">
        <button 
          onClick={onSwitchToDriver}
          className="hover:text-white transition flex items-center gap-1.5 bg-zinc-900/40 hover:bg-zinc-900 border border-zinc-850 px-3 py-1.5 rounded-full"
        >
          <span>Open Driver Dispatch Console</span>
        </button>
        <span>•</span>
        <button 
          onClick={resetDemoState}
          className="hover:text-white transition flex items-center gap-1.5 bg-zinc-900/40 hover:bg-zinc-900 border border-zinc-850 px-3 py-1.5 rounded-full"
        >
          <span>Reset Session Data</span>
        </button>
      </div>

    </div>
  );
}
