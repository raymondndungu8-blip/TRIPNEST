import React, { useState } from 'react';
import { 
  Users, User, Phone, CheckCircle, Navigation, ToggleLeft, ToggleRight, 
  Clock, Shield, DollarSign, MapPin, Eye, Star, Smartphone, Sliders, AlertTriangle
} from 'lucide-react';
import { Passenger, Driver, Booking, VehicleCategory, RideType } from '../types';
import TripnestLogo from './TripnestLogo';

interface DriverDashboardViewProps {
  drivers: Driver[];
  setDrivers: React.Dispatch<React.SetStateAction<Driver[]>>;
  bookings: Booking[];
  setBookings: React.Dispatch<React.SetStateAction<Booking[]>>;
  activeNotification: any;
  handleDriverAccept: (id: string) => void;
  handleDriverReject: (id: string) => void;
  onSwitchToRider?: () => void;
}

export default function DriverDashboardView({
  drivers,
  setDrivers,
  bookings,
  setBookings,
  activeNotification,
  handleDriverAccept,
  handleDriverReject,
  onSwitchToRider
}: DriverDashboardViewProps) {

  // We need to know who the simulated active driver is (represented in driver mode)
  // Let's offer a selector to pick which driver we are logged in as, or signup a NEW driver!
  const [activeDriverId, setActiveDriverId] = useState<string>('driver-marcus');
  const activeDriver = drivers.find(d => d.id === activeDriverId);

  // Driver OTP validation state handlers
  const [driverOtpInputs, setDriverOtpInputs] = useState<{[bookingId: string]: string}>({});
  const [driverOtpErrors, setDriverOtpErrors] = useState<{[bookingId: string]: string}>({});
  const [driverOtpVerifying, setDriverOtpVerifying] = useState<{[bookingId: string]: boolean}>({});

  // Signup form states
  const [showSignup, setShowSignup] = useState(false);
  const [signupForm, setSignupForm] = useState({
    name: '',
    phone: '',
    vehicleType: '',
    carPlate: '',
    currentLocation: 'Westlands, Nairobi',
    frequentLocation: 'Westlands & Kilimani',
    category: 'Standard' as VehicleCategory
  });
  const [signupError, setSignupError] = useState('');

  const registerDriver = (e: React.FormEvent) => {
    e.preventDefault();
    if (!signupForm.name || !signupForm.phone || !signupForm.vehicleType || !signupForm.carPlate) {
      setSignupError('All signup inputs (Name, Phone, Vehicle, Plate) are required to proceed.');
      return;
    }

    const newId = `driver-${Date.now()}`;
    const newDriver: Driver = {
      id: newId,
      name: signupForm.name,
      phone: signupForm.phone,
      vehicleType: signupForm.vehicleType,
      carPlate: signupForm.carPlate,
      currentLocation: signupForm.currentLocation,
      frequentLocation: signupForm.frequentLocation,
      category: signupForm.category,
      rating: 5.0,
      tripsCount: 0,
      isOnline: true,
      isFavorite: false,
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
      isRegistered: true
    };

    setDrivers(prev => [...prev, newDriver]);
    setActiveDriverId(newId);
    setShowSignup(false);
    setSignupError('');
  };

  // Toggle Driver Online / Availability State ON/OFF
  const toggleAvailability = () => {
    if (!activeDriver) return;
    setDrivers(prev => prev.map(d => {
      if (d.id === activeDriver.id) {
        return { ...d, isOnline: !d.isOnline };
      }
      return d;
    }));
  };

  // Scheduled rides: Rides matching this driver or general scheduled bookings
  const scheduledRides = bookings.filter(b => b.driverId === activeDriverId && (b.status === 'accepted' || b.status === 'en_route'));
  const pastRides = bookings.filter(b => b.driverId === activeDriverId && b.status === 'completed');

  // Find incoming alerts for the logged in driver (if availability is ON)
  const incomingAlerts = bookings.filter(b => 
    b.status === 'searching' && 
    b.driverId === activeDriverId && 
    activeDriver?.isOnline
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-300">
      
      {/* Sidebar: Active Driver Controller */}
      <div className="lg:col-span-1 flex flex-col gap-5">
        
        {/* Navigation Control Board / Switch Back */}
        {onSwitchToRider && (
          <div className="p-5 bg-zinc-950 border border-zinc-900 rounded-2xl flex flex-col gap-2.5 shadow-xl">
            <div className="flex items-center gap-2 text-primary font-bold">
              <TripnestLogo variant="icon" className="w-5 h-5 shrink-0" />
              <h5 className="text-[11px] uppercase tracking-wider text-white">Dashboard Control Board</h5>
            </div>
            <p className="text-[10px] text-zinc-400">Switch dashboards to simulate driver/rider triggers simultaneously.</p>
            <button 
              id="switch-persona-client"
              type="button"
              onClick={onSwitchToRider}
              className="w-full bg-[#007AFF] hover:bg-[#0066D6] text-white py-2.5 rounded-xl font-bold text-[10px] uppercase transition-all shadow-md active:scale-95 flex items-center justify-center gap-1.5"
            >
              <User className="w-3.5 h-3.5" />
              <span>Switch to Rider Dash</span>
            </button>
          </div>
        )}

        {/* Driver identity management card */}
        <div className="glass-panel p-5 rounded-2xl shadow-xl flex flex-col gap-4">
          <div className="pb-2 border-b border-outline-variant/10 flex justify-between items-center">
            <h3 className="text-xs font-bold uppercase tracking-wider text-on-surface-variant flex items-center gap-1.5">
              <TripnestLogo variant="icon" className="w-4 h-4" />
              <span>Simulated Driver Identity</span>
            </h3>
            <button 
              id="show-signup-toggle"
              onClick={() => setShowSignup(!showSignup)}
              className="text-[10px] bg-primary/10 text-primary font-bold px-2 py-1 rounded hover:bg-primary/20"
            >
              {showSignup ? 'Choose Profile' : 'Signup New Driver'}
            </button>
          </div>

          {showSignup ? (
            <form onSubmit={registerDriver} className="flex flex-col gap-3.5 text-xs text-on-surface">
              <p className="text-[10px] text-on-surface-variant bg-primary/5 p-2 rounded">
                Register a new driver guide and toggle categories to test priority algorithms.
              </p>

              <div className="flex flex-col gap-1">
                <label className="font-semibold text-on-surface-variant">Name</label>
                <input 
                  id="driver-signup-name"
                  type="text" 
                  placeholder="Evelyn Kinyua"
                  className="bg-surface-container border border-outline-variant/30 rounded-lg p-2 outline-none focus:border-primary text-xs"
                  value={signupForm.name}
                  onChange={e => setSignupForm({...signupForm, name: e.target.value})}
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-semibold text-on-surface-variant">Phone number</label>
                <input 
                  id="driver-signup-phone"
                  type="tel" 
                  placeholder="+254 711 222 333"
                  className="bg-surface-container border border-outline-variant/30 rounded-lg p-2 outline-none focus:border-primary text-xs"
                  value={signupForm.phone}
                  onChange={e => setSignupForm({...signupForm, phone: e.target.value})}
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-semibold text-on-surface-variant">Vehicle type / Model</label>
                <input 
                  id="driver-signup-vehicle"
                  type="text" 
                  placeholder="White Tesla Model Y"
                  className="bg-surface-container border border-outline-variant/30 rounded-lg p-2 outline-none focus:border-primary text-xs"
                  value={signupForm.vehicleType}
                  onChange={e => setSignupForm({...signupForm, vehicleType: e.target.value})}
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-semibold text-on-surface-variant">Car plate number</label>
                <input 
                  id="driver-signup-plate"
                  type="text" 
                  placeholder="KDD 123X"
                  className="bg-surface-container border border-outline-variant/30 rounded-lg p-2 outline-none focus:border-primary text-xs"
                  value={signupForm.carPlate}
                  onChange={e => setSignupForm({...signupForm, carPlate: e.target.value})}
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1">
                  <label className="font-semibold text-on-surface-variant">Current Location</label>
                  <input 
                    id="driver-signup-loc"
                    type="text" 
                    placeholder="Nairobi Westlands"
                    className="bg-surface-container border border-outline-variant/30 rounded-lg p-2 outline-none focus:border-primary text-xs"
                    value={signupForm.currentLocation}
                    onChange={e => setSignupForm({...signupForm, currentLocation: e.target.value})}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="font-semibold text-on-surface-variant">Frequent Operating Area</label>
                  <input 
                    id="driver-signup-freq"
                    type="text" 
                    placeholder="Kilimani & Westlands"
                    className="bg-surface-container border border-outline-variant/30 rounded-lg p-2 outline-none focus:border-primary text-xs"
                    value={signupForm.frequentLocation}
                    onChange={e => setSignupForm({...signupForm, frequentLocation: e.target.value})}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-semibold text-on-surface-variant">Vehicle category</label>
                <div className="grid grid-cols-3 gap-1">
                  {(['Standard', 'XL', 'Premium'] as VehicleCategory[]).map(cat => (
                    <button
                      key={cat}
                      id={`signup-class-${cat}`}
                      type="button"
                      onClick={() => setSignupForm({...signupForm, category: cat})}
                      className={`p-1.5 rounded border text-[10px] font-bold ${signupForm.category === cat ? 'bg-primary/20 border-primary text-primary' : 'bg-surface-container-high border-outline-variant/35 text-on-surface-variant'}`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {signupError && <p className="text-[10px] text-red-400 font-semibold">{signupError}</p>}

              <button 
                id="submit-driver-signup"
                type="submit"
                className="w-full bg-primary py-2.5 rounded font-bold text-xs text-white"
              >
                Register &amp; Login as Driver
              </button>
            </form>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-bold text-on-surface-variant uppercase ml-0.5">Profile Selector</label>
                <select 
                  id="driver-select"
                  className="w-full bg-surface-container border border-outline-variant/30 rounded-xl py-2 px-3 text-xs text-on-surface outline-none"
                  value={activeDriverId}
                  onChange={(e) => setActiveDriverId(e.target.value)}
                >
                  {drivers.map(d => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.category} Class - {d.tripsCount} trips)
                    </option>
                  ))}
                </select>
              </div>

              {activeDriver && (
                <div className="p-3.5 bg-surface-container/40 border border-outline-variant/20 rounded-xl flex flex-col gap-3">
                  <div className="flex items-center gap-3">
                    <img alt={activeDriver.name} className="w-11 h-11 rounded-full border-2 border-primary object-cover" src={activeDriver.avatarUrl} />
                    <div className="leading-tight">
                      <h4 className="font-bold text-xs text-on-surface">{activeDriver.name}</h4>
                      <p className="text-[10px] text-on-surface-variant mt-0.5">{activeDriver.vehicleType}</p>
                      <span className="text-[9px] font-bold bg-primary/10 text-primary px-1.5 py-0.5 rounded mt-1.5 inline-block">
                        {activeDriver.category} Level • {activeDriver.carPlate}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 border-t border-outline-variant/10 pt-3 text-[10px] text-on-surface-variant">
                    <div>
                      <span className="block opacity-65 uppercase font-bold text-[8px]">Frequent operating</span>
                      <strong className="text-on-surface font-semibold block truncate">{activeDriver.frequentLocation}</strong>
                    </div>
                    <div>
                      <span className="block opacity-65 uppercase font-bold text-[8px]">Current position</span>
                      <strong className="text-on-surface font-semibold block truncate">{activeDriver.currentLocation}</strong>
                    </div>
                  </div>

                  {/* Availability Toggle ON/OFF */}
                  <div className="flex items-center justify-between border-t border-outline-variant/10 pt-3 text-xs">
                    <div className="flex flex-col">
                      <span className="font-bold text-on-surface">Go Online / Busy</span>
                      <span className="text-[10px] text-on-surface-variant">Toggle active dispatch calls</span>
                    </div>
                    <button 
                      id="driver-online-toggle"
                      onClick={toggleAvailability}
                      className="text-on-surface"
                      title={activeDriver.isOnline ? "Switch Offline" : "Switch Online"}
                    >
                      {activeDriver.isOnline ? (
                        <span className="text-green-500 font-bold flex items-center gap-1 cursor-pointer">
                          <CheckCircle className="w-4 h-4 text-green-500" />
                          <span>ACTIVE</span>
                        </span>
                      ) : (
                        <span className="text-red-400 font-bold flex items-center gap-1 cursor-pointer">
                          <AlertTriangle className="w-4 h-4 text-red-400" />
                          <span>OFFLINE</span>
                        </span>
                      )}
                    </button>
                  </div>

                  {/* DRIVER WELCOME - Dynamic Commission Shield (Priority #4 lower driver commissions to attract more drivers) */}
                  <div className="border-t border-outline-variant/15 pt-3.5 mt-1 text-left space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[8px] font-black uppercase tracking-wider text-[#007AFF]">Driver Commission Shield</span>
                      <span className="bg-green-500/10 text-green-400 text-[8px] font-black uppercase px-2 py-0.5 rounded">Lowest 5% Rate</span>
                    </div>
                    <p className="text-[10px] text-zinc-400 leading-relaxed">
                      Tripnest driver commissions have been permanently lowered to just <strong className="text-white">5%</strong> (down from Bolt's 20% standard) to maximize your high-yield earnings.
                    </p>
                    <div className="p-2.5 bg-zinc-950 rounded-xl border border-zinc-900 flex justify-between items-center text-[10px]">
                      <div>
                        <span className="text-[8px] uppercase text-zinc-500 block leading-none mb-1">ESTIMATED YIELD PROGRESSION</span>
                        <span className="font-semibold text-zinc-300">Retain $4.50 more on every $25.00 ride standard</span>
                      </div>
                      <span className="bg-[#007AFF]/10 text-[#007AFF] font-bold px-2 py-1 rounded text-[9px] uppercase tracking-tight">Locked</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Main Column: Receive Ride Requests alerts list */}
      <div className="lg:col-span-2 flex flex-col gap-6">
        
        {/* Real-time Dispatch alerts */}
        <div className="glass-panel p-5 md:p-6 rounded-2xl shadow-xl flex flex-col gap-4">
          <div>
            <span className="text-[10px] font-bold text-green-400 uppercase tracking-widest block mb-1">
              Smart Cascading Dispatch
            </span>
            <h3 className="font-display font-black text-lg text-on-surface">
              Incoming Ride Requests Alerts
            </h3>
            <p className="text-xs text-on-surface-variant mt-0.5">
              Select accept or reject below. Rejections feed the booking cascading queue to the next nearby criteria guide.
            </p>
          </div>

          {!activeDriver?.isOnline ? (
            <div className="py-8 text-center border border-dashed border-outline-variant/30 rounded-xl bg-surface-container/20 text-xs text-on-surface-variant">
              You are currently <strong className="text-red-400">OFFLINE</strong>. Please toggle your availability ON in the profile panel to start receiving active passenger dispatch requests.
            </div>
          ) : incomingAlerts.length === 0 ? (
            <div className="py-8 text-center border border-dashed border-outline-variant/30 rounded-xl bg-surface-container/20 text-xs text-on-surface-variant flex flex-col items-center gap-2">
              <div className="w-5 h-5 rounded-full border-2 border-green-500 border-t-transparent animate-spin" />
              <span>Standby. Searching for scheduled transits matches in your category ({activeDriver.category})...</span>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {incomingAlerts.map(alert => {
                return (
                  <div 
                    key={alert.id}
                    className="bg-primary/5 border border-primary/30 rounded-2xl p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 animate-in slide-in-from-bottom-2"
                  >
                    <div className="flex-grow space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="bg-primary text-white text-[9px] font-bold px-2 py-0.5 rounded-full uppercase">
                          {alert.rideType} Ride
                        </span>
                        <span className="bg-gray-700 text-on-surface-variant text-[9px] font-bold px-2 py-0.5 rounded-full uppercase">
                          Category: {alert.category}
                        </span>
                        {alert.eventName && (
                          <span className="bg-purple-950/80 text-purple-200 text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                            Event Match: {alert.eventName}
                          </span>
                        )}
                      </div>

                      <div className="space-y-1 text-xs">
                        <p className="text-on-surface-variant flex items-center gap-1.5">
                          <MapPin className="w-4 h-4 text-red-400 shrink-0" />
                          <span>Pickup: <strong className="text-on-surface">{alert.pickup}</strong></span>
                        </p>
                        <p className="text-on-surface-variant flex items-center gap-1.5">
                          <Navigation className="w-4 h-4 text-primary shrink-0" />
                          <span>Destination: <strong className="text-on-surface">{alert.destination}</strong></span>
                        </p>
                        <p className="text-on-surface-variant flex items-center gap-1.5 flex-wrap">
                          <Clock className="w-4 h-4 text-on-surface-variant shrink-0" />
                          <span>Date/Time departure: <strong>{new Date(alert.dateTime).toLocaleString()}</strong></span>
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-3 shrink-0 self-stretch md:self-center justify-between">
                      <div className="text-right">
                        <span className="block text-[10px] uppercase font-bold text-on-surface-variant">Fare</span>
                        <strong className="text-xl font-black text-primary">KES {alert.fare?.amount || alert.originalPrice}</strong>
                      </div>

                      <div className="flex gap-2 w-full md:w-auto">
                        <button 
                          id={`driver-accept-btn-${alert.id}`}
                          onClick={() => handleDriverAccept(alert.id)}
                          className="flex-1 md:flex-initial bg-green-500 hover:bg-green-400 text-black font-extrabold text-xs px-4 py-2.5 rounded-xl transition-all active:scale-95"
                        >
                          Accept Ride
                        </button>
                        <button 
                          id={`driver-reject-btn-${alert.id}`}
                          onClick={() => handleDriverReject(alert.id)}
                          className="flex-1 md:flex-initial bg-gray-800 hover:bg-gray-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all"
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Scheduled / Accepted Rides list matches driver view specifications */}
        <div className="glass-panel p-5 md:p-6 rounded-2xl shadow-xl flex flex-col gap-4">
          <h3 className="font-display font-black text-sm text-on-surface uppercase tracking-wider flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse" />
            <span>My Active &amp; Scheduled rides ({scheduledRides.length})</span>
          </h3>

          {scheduledRides.length === 0 ? (
            <p className="text-xs text-on-surface-variant py-6 text-center border border-outline-variant/15 rounded-xl bg-surface-container/10">
              No accepted scheduled voyages in progress for your active guide level.
            </p>
          ) : (
            <div className="flex flex-col gap-3">
              {scheduledRides.map(ride => {
                const otpInput = driverOtpInputs[ride.id] || '';
                const otpError = driverOtpErrors[ride.id] || '';

                return (
                  <div 
                    key={ride.id}
                    className="bg-surface-container/40 border border-outline-variant/20 p-4 rounded-xl flex flex-col md:flex-row justify-between gap-4 text-xs"
                  >
                    <div className="space-y-1.5 flex-grow">
                      <p className="text-on-surface-variant">
                        Pickup: <strong className="text-on-surface">{ride.pickup}</strong>
                      </p>
                      <p className="text-on-surface-variant">
                        Destination: <strong className="text-on-surface">{ride.destination}</strong>
                      </p>
                      <p className="text-on-surface-variant">
                        Pickup Time: <strong className="text-on-surface">{new Date(ride.dateTime).toLocaleString()}</strong>
                      </p>
                      <div className="flex items-center gap-2 pt-1">
                        <span className="bg-primary/20 text-primary uppercase text-[8px] font-bold px-1.5 py-0.5 rounded">
                          {ride.rideType}
                        </span>
                        <span className="bg-gray-700 text-on-surface-variant uppercase text-[8px] font-bold px-1.5 py-0.5 rounded">
                          {ride.category} Category
                        </span>
                      </div>

                      {/* Display live state-machine driver status feedback */}
                      <div className="mt-3 p-2 rounded bg-zinc-950/60 border border-zinc-900 leading-normal">
                        {!ride.driverArrived ? (
                          <span className="text-yellow-400 font-bold text-[10px] uppercase flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse" />
                            En route to Passenger pickup...
                          </span>
                        ) : !ride.isStarted ? (
                          <span className="text-orange-400 font-bold text-[10px] uppercase flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-ping" />
                            Arrived at lobby. Waiting for Passenger OTP confirmation...
                          </span>
                        ) : (
                          <span className="text-green-400 font-bold text-[10px] uppercase flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                            Trip In Progress... Enjoy the transit!
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col justify-between items-end shrink-0 md:w-48 text-right gap-3">
                      <div>
                        <span className="block text-[8px] uppercase tracking-wider opacity-60">Fare Ticket</span>
                        <strong className="text-sm font-black text-primary">KES {ride.fare?.amount || ride.originalPrice}</strong>
                      </div>

                      {/* Driver Action Stepper Layout */}
                      <div className="w-full space-y-2">
                        {!ride.driverArrived ? (
                          <button 
                            id={`driver-sim-arrive-${ride.id}`}
                            onClick={() => {
                              setBookings(prev => prev.map(b => b.id === ride.id ? { ...b, driverArrived: true } : b));
                            }}
                            className="w-full bg-[#007AFF] hover:bg-[#005EC2] text-white font-extrabold px-3 py-2 rounded-lg text-[10.5px] transition-all uppercase"
                          >
                            Report Arrival at Lobby
                          </button>
                        ) : !ride.isStarted ? (
                          <div className="space-y-1.5 text-left bg-zinc-900/60 p-2 border border-zinc-850 rounded-lg">
                            <label className="block text-[9px] uppercase font-bold text-zinc-400">Enter Rider OTP Code</label>
                            <div className="flex gap-1.5">
                              <input 
                                id={`driver-otp-input-${ride.id}`}
                                type="text"
                                maxLength={6}
                                disabled={!!driverOtpVerifying[ride.id]}
                                placeholder="e.g. 5813"
                                className="w-full bg-zinc-950 border border-zinc-850 text-white p-1 rounded font-mono text-center text-xs outline-none focus:border-[#007AFF] disabled:opacity-50"
                                value={otpInput}
                                onChange={e => {
                                  const val = e.target.value;
                                  setDriverOtpInputs(prev => ({ ...prev, [ride.id]: val }));
                                }}
                              />
                              <button 
                                id={`driver-otp-verify-${ride.id}`}
                                disabled={!!driverOtpVerifying[ride.id]}
                                onClick={async () => {
                                  const trimmedValue = otpInput.trim();
                                  
                                  setDriverOtpVerifying(prev => ({ ...prev, [ride.id]: true }));
                                  setDriverOtpErrors(prev => ({ ...prev, [ride.id]: '' }));
                                  
                                  try {
                                    const response = await fetch("/api/verify-otp", {
                                      method: "POST",
                                      headers: {
                                        "Content-Type": "application/json",
                                      },
                                      body: JSON.stringify({
                                        bookingId: ride.id,
                                        otpCode: trimmedValue,
                                      }),
                                    });

                                    const result = await response.json();
                                    
                                    if (response.ok && result.success) {
                                      // Backend updated Firestore; update local state-wrapper as well for immediate UI response
                                      setBookings(prev => prev.map(b => b.id === ride.id ? { ...b, status: 'en_route', isStarted: true } : b));
                                    } else {
                                      setDriverOtpErrors(prev => ({ 
                                        ...prev, 
                                        [ride.id]: result.error || 'BACKEND_API_SECURE_ERR: Driver OTP verification failed.' 
                                      }));
                                    }
                                  } catch (err: any) {
                                    console.error("Backend OTP verification error:", err);
                                    setDriverOtpErrors(prev => ({ 
                                      ...prev, 
                                      [ride.id]: `NETWORK_ERR: ${err.message || String(err)}` 
                                    }));
                                  } finally {
                                    setDriverOtpVerifying(prev => ({ ...prev, [ride.id]: false }));
                                  }
                                }}
                                className="bg-green-500 hover:bg-green-400 disabled:bg-zinc-800 text-black font-black px-2.5 py-1 rounded text-[10px] uppercase flex items-center gap-1 cursor-pointer disabled:cursor-not-allowed"
                              >
                                {driverOtpVerifying[ride.id] ? (
                                  <span className="w-3.5 h-3.5 border-2 border-zinc-950 border-t-transparent rounded-full animate-spin" />
                                ) : (
                                  <span>Verify</span>
                                )}
                              </button>
                            </div>
                            {otpError && (
                              <p className="text-[9px] text-red-400 font-extrabold tracking-wide uppercase">{otpError}</p>
                            )}
                            <p className="text-[8.5px] text-zinc-500 leading-none mt-1">Ask the rider for their 4-digit security PIN.</p>
                          </div>
                        ) : (
                          <button 
                            id={`driver-sim-complete-${ride.id}`}
                            onClick={() => {
                              // Directly trigger completion inside data state
                              setBookings(prev => prev.map(b => b.id === ride.id ? { ...b, status: 'completed' as const } : b));
                              alert('Transit reported completed successfully! Transitioning client page to Rating dashboard.');
                            }}
                            className="w-full bg-green-500 hover:bg-green-400 text-black font-extrabold px-3 py-2 rounded-lg text-[10.5px] transition-all uppercase"
                          >
                            Complete Ride
                          </button>
                        )}
                      </div>

                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* History of completed trips */}
        <div className="glass-panel p-5 rounded-2xl shadow-xl flex flex-col gap-3">
          <h4 className="font-display font-medium text-xs text-on-surface-variant uppercase tracking-wider">
            Completed Trip Logs ({pastRides.length})
          </h4>

          {pastRides.length === 0 ? (
            <p className="text-[10px] text-on-surface-variant italic">No previous completed trips on this device.</p>
          ) : (
            <div className="space-y-2">
              {pastRides.map(p => (
                <div key={p.id} className="flex justify-between items-center text-xs text-on-surface-variant p-2.5 bg-surface-container/30 rounded-lg">
                  <div>
                    <span className="font-bold text-on-surface">{p.destination}</span>
                    <span className="block text-[9px] opacity-65">{new Date(p.dateTime).toLocaleDateString()}</span>
                  </div>
                    <strong className="text-green-400 font-bold">+KES {p.fare?.amount || p.originalPrice}</strong>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
