import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Compass, History, Smartphone, User, Star, Shield, HelpCircle, 
  MapPin, CheckCircle, SmartphoneIcon, Laptop, CornerRightDown, Map, Heart, LogOut
} from 'lucide-react';
import { EVENTS_DATA, INITIAL_DRIVERS, INITIAL_PASSENGER } from './data';
import { Driver, EventItem, Booking, Passenger, DriverNotification } from './types';
import ClientDashboardView from './components/ClientDashboardView';
import DriverDashboardView from './components/DriverDashboardView';
import TripnestLogo from './components/TripnestLogo';

// Firebase core imports
import { 
  db, auth, googleProvider, signInWithPopup, signOut, 
  handleFirestoreError, OperationType 
} from './firebase';
import { 
  collection, doc, setDoc, getDoc, updateDoc, onSnapshot, getDocs 
} from 'firebase/firestore';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';

export default function App() {
  // Underlying state stores
  const [passenger, setPassengerState] = useState<Passenger>(INITIAL_PASSENGER);
  const [drivers, setDriversState] = useState<Driver[]>(INITIAL_DRIVERS);
  const [bookings, setBookingsState] = useState<Booking[]>([]);

  // Auth States
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);

  // Persona Mode: 'client' | 'driver'
  const [personaMode, setPersonaMode] = useState<'client' | 'driver'>('client');
  
  // Tab within persona mode
  const [clientTab, setClientTab] = useState<'book' | 'history'>('book');

  // Rating Modal state
  const [ratingDriverId, setRatingDriverId] = useState<string | null>(null);
  const [ratingStars, setRatingStars] = useState(5);
  const [ratingFavorite, setRatingFavorite] = useState(false);

  // Active notification for Driver mode overlay
  const [activeNotification, setActiveNotification] = useState<DriverNotification | null>(null);

  // 1. Auth Sync and Realtime Passenger Fetching
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setUser(fbUser);
      setIsLoadingAuth(false);
      if (fbUser) {
        const passengerRef = doc(db, 'passengers', fbUser.uid);
        const driverRef = doc(db, 'drivers', fbUser.uid);
        try {
          const drSnap = await getDoc(driverRef);
          if (drSnap.exists()) {
            setPersonaMode('driver');
          } else {
            setPersonaMode('client');
          }

          const snap = await getDoc(passengerRef);
          if (!snap.exists()) {
            const newPassenger: Passenger = {
              id: fbUser.uid,
              name: fbUser.displayName || 'Demo Passenger',
              email: fbUser.email || 'passenger@tripnest.com',
              phone: fbUser.phoneNumber || '+254 700 000 000',
              tripsCount: 0,
              rating: 5.0,
              premium: false,
              avatarUrl: fbUser.photoURL || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
              isRegistered: true
            };
            await setDoc(passengerRef, newPassenger);
            setPassengerState(newPassenger);
          } else {
            setPassengerState(snap.data() as Passenger);
          }
        } catch (err) {
          console.error("Error fetching or initializing passenger profile:", err);
        }
      } else {
        // Fallback to local storage or defaults for offline / anon flow
        const saved = localStorage.getItem('tripnest_passenger');
        setPassengerState(saved ? JSON.parse(saved) : INITIAL_PASSENGER);
      }
    });
    return () => unsubscribe();
  }, []);

  // Realtime Passenger Subscription if logged in
  useEffect(() => {
    if (!user) return;
    const passengerRef = doc(db, 'passengers', user.uid);
    const unsub = onSnapshot(passengerRef, (docSnap) => {
      if (docSnap.exists()) {
        setPassengerState(docSnap.data() as Passenger);
      }
    }, (err) => {
      console.error("Passenger Snapshot subscription error:", err);
    });
    return () => unsub();
  }, [user]);

  // 2. Realtime Drivers Subscription and Self-Healing Database Seed
  useEffect(() => {
    if (!user) {
      // Offline fallback
      const saved = localStorage.getItem('tripnest_drivers_val');
      setDriversState(saved ? JSON.parse(saved) : INITIAL_DRIVERS);
      return;
    }
    const unsub = onSnapshot(collection(db, 'drivers'), async (querySnapshot) => {
      if (querySnapshot.empty) {
        // Seed database drivers collection if empty
        for (const drv of INITIAL_DRIVERS) {
          try {
            await setDoc(doc(db, 'drivers', drv.id), drv);
          } catch (e) {
            console.error("Error seeding driver reference element:", drv.id, e);
          }
        }
        return;
      }
      const list: Driver[] = [];
      querySnapshot.forEach((doc) => {
        list.push(doc.data() as Driver);
      });
      list.sort((a, b) => a.id.localeCompare(b.id));
      setDriversState(list);
    }, (error) => {
      console.error("Drivers collection subscription error:", error);
    });
    return () => unsub();
  }, [user]);

  // 3. Realtime Bookings Subscription
  useEffect(() => {
    if (!user) {
      // Offline fallback
      const saved = localStorage.getItem('tripnest_bookings_val');
      setBookingsState(saved ? JSON.parse(saved) : []);
      return;
    }
    const unsub = onSnapshot(collection(db, 'bookings'), (querySnapshot) => {
      const list: Booking[] = [];
      querySnapshot.forEach((doc) => {
        list.push(doc.data() as Booking);
      });
      list.sort((a, b) => b.id.localeCompare(a.id));
      setBookingsState(list);
    }, (error) => {
      console.error("Bookings collection subscription error:", error);
    });
    return () => unsub();
  }, [user]);

  // Transparent Data State Wrapper: setPassenger
  const setPassenger = (updateAction: React.SetStateAction<Passenger>) => {
    setPassengerState(prevPassenger => {
      const nextPassenger = typeof updateAction === 'function' ? (updateAction as any)(prevPassenger) : updateAction;
      if (user) {
        setDoc(doc(db, 'passengers', user.uid), nextPassenger)
          .catch(e => handleFirestoreError(e, OperationType.UPDATE, `passengers/${user.uid}`));
      } else {
        localStorage.setItem('tripnest_passenger', JSON.stringify(nextPassenger));
      }
      return nextPassenger;
    });
  };

  // Transparent Data State Wrapper: setDrivers
  const setDrivers = (updateAction: React.SetStateAction<Driver[]>) => {
    setDriversState(prevDrivers => {
      const nextDrivers = typeof updateAction === 'function' ? (updateAction as any)(prevDrivers) : updateAction;
      if (user) {
        const updated = nextDrivers.filter((nd: Driver) => {
          const matching = prevDrivers.find(d => d.id === nd.id);
          return matching && JSON.stringify(matching) !== JSON.stringify(nd);
        });
        for (const drv of updated) {
          setDoc(doc(db, 'drivers', drv.id), drv)
            .catch(e => handleFirestoreError(e, OperationType.UPDATE, `drivers/${drv.id}`));
        }
      } else {
        localStorage.setItem('tripnest_drivers_val', JSON.stringify(nextDrivers));
      }
      return nextDrivers;
    });
  };

  // Transparent Data State Wrapper: setBookings
  const setBookings = (updateAction: React.SetStateAction<Booking[]>) => {
    setBookingsState(prevBookings => {
      const nextBookings = typeof updateAction === 'function' ? (updateAction as any)(prevBookings) : updateAction;
      if (user) {
        // Create new bookings in Firestore
        const added = nextBookings.filter((nb: Booking) => !prevBookings.some(b => b.id === nb.id));
        for (const b of added) {
          setDoc(doc(db, 'bookings', b.id), b)
            .catch(e => handleFirestoreError(e, OperationType.CREATE, `bookings/${b.id}`));
        }
        // Update modified bookings in Firestore
        const updated = nextBookings.filter((nb: Booking) => {
          const matching = prevBookings.find(b => b.id === nb.id);
          return matching && JSON.stringify(matching) !== JSON.stringify(nb);
        });
        for (const b of updated) {
          const matching = prevBookings.find(orig => orig.id === b.id);
          if (matching) {
            const updatedFields: Partial<Booking> = {};
            for (const key of Object.keys(b) as Array<keyof Booking>) {
              if (JSON.stringify(b[key]) !== JSON.stringify(matching[key])) {
                (updatedFields as any)[key] = b[key];
              }
            }
            if (Object.keys(updatedFields).length > 0) {
              updateDoc(doc(db, 'bookings', b.id), updatedFields)
                .catch(e => handleFirestoreError(e, OperationType.UPDATE, `bookings/${b.id}`));
            }
          }
        }
      } else {
        localStorage.setItem('tripnest_bookings_val', JSON.stringify(nextBookings));
      }
      return nextBookings;
    });
  };

  // Find any active booking for the client (searching, accepted or en_route)
  const activeBooking = bookings.find(b => b.status === 'searching' || b.status === 'accepted' || b.status === 'en_route');

  // SIMULATED DISPATCH CASCADING LOGIC
  // When a booking is 'searching', assign it to the first driver in the remaining availablePool who is ONLINE.
  const activeBookingId = activeBooking?.id;
  const activeBookingStatus = activeBooking?.status;
  const activeBookingDriverId = activeBooking?.driverId;
  const activeBookingPool = activeBooking?.availableDriverPool;
  const activeBookingPoolLength = activeBookingPool?.length;

  useEffect(() => {
    if (!activeBookingId || activeBookingStatus !== 'searching') return;

    const remainingPool = activeBookingPool || [];
    const currentDriverId = activeBookingDriverId;

    // If no driver is currently assigned, and we still have candidates in the pool
    if (!currentDriverId && remainingPool.length > 0) {
      
      let nextDriverId: string | null = null;
      let nextPoolIdx = 0;

      // Search the pool for the next driver who is ONLINE
      for (let i = 0; i < remainingPool.length; i++) {
        const possibleDriver = drivers.find(d => d.id === remainingPool[i]);
        if (possibleDriver && possibleDriver.isOnline) {
          nextDriverId = remainingPool[i];
          nextPoolIdx = i;
          break;
        }
      }

      if (nextDriverId) {
        // Found an online driver to dispatch request to!
        setBookings(prev => prev.map(b => {
          if (b.id === activeBookingId) {
            return {
              ...b,
              driverId: nextDriverId,
              // Slice any checked candidates up to and including the matching index out of the remaining pool
              availableDriverPool: remainingPool.slice(nextPoolIdx + 1)
            };
          }
          return b;
        }));
      } else {
        // None of the remaining candidates in the pool are ONLINE right now
        setBookings(prev => prev.map(b => {
          if (b.id === activeBookingId) {
            return { ...b, status: 'rejected_by_all' as const };
          }
          return b;
        }));
        alert('Cascade Dispatch alert: No online vehicle category guides are currently active for this event request.');
      }
    } else if (!currentDriverId && remainingPool.length === 0) {
      // All candidates checked and rejected
      setBookings(prev => prev.map(b => {
        if (b.id === activeBookingId) {
          return { ...b, status: 'rejected_by_all' as const };
        }
        return b;
      }));
    }
  }, [activeBookingId, activeBookingStatus, activeBookingDriverId, activeBookingPoolLength, drivers]);

  // Client Toggles favoriting status of drivers
  const toggleFavoriteDriver = (driverId: string) => {
    setDrivers(prev => prev.map(d => d.id === driverId ? { ...d, isFavorite: !d.isFavorite } : d));
  };

  // Driver mode Accept Action
  const handleDriverAccept = (bookingId: string) => {
    setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status: 'accepted' as const } : b));
  };

  // Driver mode Reject / Refuse Action (tricks cascading loop to re-examine the pool)
  const handleDriverReject = (bookingId: string) => {
    setBookings(prev => prev.map(b => {
      if (b.id === bookingId) {
        return {
          ...b,
          driverId: null, // Wipe to trigger next candidate in cascading loop
          rejectedDriverIds: [...b.rejectedDriverIds, b.driverId!]
        };
      }
      return b;
    }));
  };

  // Passenger Simulated Complete Trip
  const simulateCompleteTrip = (bookingId: string) => {
    const currentBk = bookings.find(b => b.id === bookingId);
    if (!currentBk) return;

    setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status: 'completed' as const } : b));
    
    // Auto load post-trip modal
    if (currentBk.driverId) {
      setRatingDriverId(currentBk.driverId);
      const isFav = drivers.find(d => d.id === currentBk.driverId)?.isFavorite || false;
      setRatingFavorite(isFav);
      setRatingStars(5);
    }
  };

  const cancelActiveTrip = (bookingId: string) => {
    setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status: 'cancelled' as const } : b));
  };

  // Post Trip star ratings submissions
  const submitRating = () => {
    if (!ratingDriverId) return;

    // Update rating history calculations inside persistent mock driver arrays
    setDrivers(prev => prev.map(d => {
      if (d.id === ratingDriverId) {
        const newTrips = d.tripsCount + 1;
        const newRating = Number(((d.rating * d.tripsCount + ratingStars) / newTrips).toFixed(2));
        return {
          ...d,
          isFavorite: ratingFavorite,
          rating: newRating > 5 ? 5 : newRating,
          tripsCount: newTrips
        };
      }
      return d;
    }));

    setRatingDriverId(null);
    setClientTab('history'); // switch to History view to inspect completion logs
  };

  // Quick helper to log out or wipe values for clean testing
  const resetDemoState = () => {
    if (confirm('Do you want to reset all custom signups, favorite driver toggles and booking records?')) {
      localStorage.removeItem('tripnest_passenger');
      localStorage.removeItem('tripnest_drivers_val');
      localStorage.removeItem('tripnest_bookings_val');
      setPassenger(INITIAL_PASSENGER);
      setDrivers(INITIAL_DRIVERS);
      setBookings([]);
      setClientTab('book');
      setPersonaMode('client');
      window.location.reload();
    }
  };

  return (
    <div className="bg-[#050608] bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-zinc-900 min-h-[100dvh] w-full flex flex-col items-center justify-center font-sans relative overflow-x-hidden select-none">
      <AnimatePresence mode="wait">
        {personaMode === 'client' ? (
          <ClientDashboardView 
            passenger={passenger}
            setPassenger={setPassenger}
            drivers={drivers}
            toggleFavoriteDriver={toggleFavoriteDriver}
            events={EVENTS_DATA}
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
            onSwitchToDriver={() => setPersonaMode('driver')}
          />
        ) : (
          <div className="flex flex-col items-center justify-center min-h-[100dvh] w-full select-none text-left p-0 sm:p-6 animate-in fade-in duration-500">
            {/* Embedded High-End Smartphone Device Mockup container for Driver view */}
            <div className="relative w-full h-screen sm:h-[840px] max-w-none sm:max-w-[390px] rounded-none sm:rounded-[50px] border-0 sm:border-[12px] border-[#1C1E24] bg-[#0E1015] shadow-none sm:shadow-[0_30px_70px_-10px_rgba(0,0,0,0.95)] flex flex-col overflow-y-auto relative z-10 font-sans leading-none select-none scrollbar-none">
              
              {/* Top Camera cutout / Sensor bar (Only visible on desktop/tablet views) */}
              <div className="hidden sm:flex absolute top-2 left-1/2 transform -translate-x-1/2 w-32 h-5 bg-zinc-900 rounded-full z-40 items-center justify-center">
                <div className="w-9 h-1 bg-black rounded-full mb-0.5" />
              </div>

              {/* Dynamic OS status panel inside driver mode viewport */}
              <header className="flex items-center justify-between px-6 pt-5 pb-2.5 bg-[#090A0D] border-b border-zinc-905/30 shrink-0 z-30 select-none">
                <span className="text-[10px] font-black text-zinc-400 font-mono tracking-tight select-none">14:02</span>
                <div className="flex items-center gap-1.5 select-none">
                  <span className="text-[9px] font-extrabold text-zinc-400 font-mono tracking-wider">DRIVER PERSPECTIVE</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-[#007AFF] animate-pulse" />
                </div>
              </header>

              <div className="p-4 flex-grow bg-zinc-950/40">
                <DriverDashboardView 
                  drivers={drivers}
                  setDrivers={setDrivers}
                  bookings={bookings}
                  setBookings={setBookings}
                  activeNotification={activeNotification}
                  handleDriverAccept={handleDriverAccept}
                  handleDriverReject={handleDriverReject}
                  onSwitchToRider={() => setPersonaMode('client')}
                />
              </div>

              {/* Simulated home indicator swipe line at the absolute bottom (Only on desktop style) */}
              <div className="hidden sm:block absolute bottom-2 left-1/2 transform -translate-x-1/2 w-28 h-1 bg-zinc-700/80 rounded-full z-30" />
            </div>

            {/* Outside back tracker option row */}
            <div className="hidden sm:flex items-center justify-center gap-4 mt-4 text-[11px] font-semibold text-zinc-500">
              <button 
                onClick={() => setPersonaMode('client')}
                className="hover:text-white transition flex items-center gap-1.5 bg-zinc-900/40 hover:bg-zinc-900 border border-zinc-850 px-3 py-1.5 rounded-full"
              >
                <span>Switch to Rider App View</span>
              </button>
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
