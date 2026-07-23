import React, { useState } from 'react';
import { 
  MapPin, Calendar, Clock, DollarSign, Users, User, Heart, Star, 
  Map, Shield, AlertTriangle, MessageSquare, Phone, CheckCircle, Navigation, 
  Sliders, ArrowRight, UserPlus, FileText, Check, Award, Compass, ThumbsUp,
  Menu, Locate, Bookmark, Sparkles, LogOut, RefreshCw, Layers, CheckSquare, X, ChevronRight, HelpCircle,
  CreditCard, Smartphone, Plus, Trash2, ShieldCheck, AlertCircle, Asterisk, Bell, Lock, Share2, Info, Search, Gift, Zap, Activity, Eye, Play
} from 'lucide-react';
import { Passenger, Driver, EventItem, Booking, PaymentMethod, Transaction } from '../types';
import { auth, db, googleProvider } from '../firebase';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  updateProfile,
  signInWithPopup 
} from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import VirtualMap from './VirtualMap';
import ActiveTripProgressBar from './ActiveTripProgressBar';

const welcomeHero = "/src/assets/images/welcome_hero_1780470147799.png";

interface PagesRendererProps {
  pageNumber: number;
  setPageNumber: (num: number) => void;
  passenger: Passenger;
  setPassenger: (p: Passenger) => void;
  drivers: Driver[];
  toggleFavoriteDriver?: (id: string) => void;
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
}

export default function PagesRenderer({
  pageNumber,
  setPageNumber,
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
  resetDemoState
}: PagesRendererProps) {
  // Local Interactive States
  const [tutorialSlide, setTutorialSlide] = useState(0);
  const [signupForm, setSignupForm] = useState({ name: '', phone: '', email: '', password: '' });
  const [signUpRole, setSignUpRole] = useState<'client' | 'driver'>('client');
  const [driverVehicleType, setDriverVehicleType] = useState('');
  const [driverCarPlate, setDriverCarPlate] = useState('');
  const [driverCurrentLocation, setDriverCurrentLocation] = useState('');
  const [driverFrequentLocation, setDriverFrequentLocation] = useState('');
  const [driverCategory, setDriverCategory] = useState<'Standard' | 'XL' | 'Premium'>('Premium');
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [otpCode, setOtpCode] = useState(['', '', '', '']);
  const [otpSent, setOtpSent] = useState(true);
  const [otpCountdown, setOtpCountdown] = useState(59);
  const [locationPerm, setLocationPerm] = useState<string | null>(null);
  
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  
  // Ordering flows
  const [searchQuery, setSearchQuery] = useState({ pickup: 'Nairobi Airport (NBO)', dropoff: '' });
  const [bookingCategory, setBookingCategory] = useState<'Standard' | 'Premium' | 'XL'>('Premium');
  const [rideType, setRideType] = useState<'Private' | 'Cost Sharing'>('Private');
  const [selectedPromo, setSelectedPromo] = useState<string>('');
  const [promoDiscount, setPromoDiscount] = useState(0);
  const [searchPromoText, setSearchPromoText] = useState('');
  const [customDateTime, setCustomDateTime] = useState<string>('');
  
  // Stops management
  const [stops, setStops] = useState<string[]>([]);
  const [newStopText, setNewStopText] = useState('');
  
  // Chat secure state
  const [chatMessages, setChatMessages] = useState<{sender: 'rider'|'driver', text: string, time: string}[]>([
    { sender: 'driver', text: 'Hello, I have arrived at the designated lobby terminal.', time: '14:02' }
  ]);
  const [chatInput, setChatInput] = useState('');

  // Pricing calculation states
  const [calculatedFare, setCalculatedFare] = useState<number | null>(null);
  const [pricingSource, setPricingSource] = useState<string>('');
  const [isCalculatingPrice, setIsCalculatingPrice] = useState(false);
  const [priceError, setPriceError] = useState<string | null>(null);

  // Fetch price from backend
  const fetchPrice = async () => {
    if (!searchQuery.pickup || !searchQuery.dropoff) return;
    setIsCalculatingPrice(true);
    setPriceError(null);
    setCalculatedFare(null);
    try {
      const resp = await fetch('/api/pricing/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pickup: searchQuery.pickup,
          destination: searchQuery.dropoff,
          vehicleCategory: bookingCategory,
          rideType: rideType === 'Private' ? 'private' : 'sharing',
        }),
      });
      const data = await resp.json();
      if (data.success) {
        setCalculatedFare(data.finalPrice);
        setPricingSource(data.source);
      } else {
        setPriceError(data.message || 'Route not available yet. Try a nearby area.');
      }
    } catch {
      setPriceError('Could not calculate fare. Check your connection.');
    } finally {
      setIsCalculatingPrice(false);
    }
  };

  // Recalculate when category, rideType, pickup, or dropoff change
  React.useEffect(() => {
    if (searchQuery.pickup && searchQuery.dropoff) {
      fetchPrice();
    } else {
      setCalculatedFare(null);
      setPriceError(null);
    }
  }, [bookingCategory, rideType, searchQuery.pickup, searchQuery.dropoff]);

  // Payment states
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([
    { id: 'pm-1', type: 'card', label: 'Gold Credit Card', details: '•••• •••• •••• 5678', isDefault: true, stripePaymentMethodId: '' },
    { id: 'pm-2', type: 'mpesa', label: 'M-Pesa Mobile', details: '+254 712 111 222', isDefault: false, mpesaPhone: '+254712111222' }
  ]);
  const [selectedPaymentId, setSelectedPaymentId] = useState('pm-1');
  const [mpesaPhoneInput, setMpesaPhoneInput] = useState('+254');
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [paymentStatusMsg, setPaymentStatusMsg] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  // Tip & Ratings states
  const [tipPercent, setTipPercent] = useState<number>(20);
  const [customTip, setCustomTip] = useState<string>('');
  const [reviewText, setReviewText] = useState('');

  // Trusted contacts
  const [emergencyContacts, setEmergencyContacts] = useState<{name: string, phone: string}[]>([
    { name: 'Grace Ndungu', phone: '+254 722 999 555' }
  ]);
  const [newContact, setNewContact] = useState({ name: '', phone: '' });

  // Saved spaces
  const [savedPlaces, setSavedPlaces] = useState<{id: string, name: string, icon: string, value: string}[]>([
    { id: '1', name: 'Home', icon: 'Home', value: '45 Greencreek Dr, Nairobi' },
    { id: '2', name: 'Work', icon: 'Briefcase', value: 'Lavington Business Park, Block C' }
  ]);
  const [newPlace, setNewPlace] = useState({ name: '', value: '' });

  // Trip Host State
  const [isHostSubscribed, setIsHostSubscribed] = useState(false);

  // Dark Mode Setting Preview
  const [modeSetting, setModeSetting] = useState<'dark' | 'light' | 'system'>('dark');

  // Create real booking helper
  const handleLaunchSearch = () => {
    const newBookingId = `booking-${Date.now()}`;
    const finalPrice = calculatedFare || (bookingCategory === 'Premium' ? 45 : bookingCategory === 'XL' ? 25 : 15);
    const finalDateTime = customDateTime || new Date().toLocaleString();

    const generatedOtp = Math.floor(1000 + Math.random() * 9000).toString();

    const selectedPayMethod = paymentMethods.find(p => p.id === selectedPaymentId);
    const newB: Booking = {
      id: newBookingId,
      pickup: searchQuery.pickup,
      destination: searchQuery.dropoff || '342 Market St, CBD',
      dateTime: finalDateTime,
      category: bookingCategory,
      rideType: rideType,
      driverId: null,
      status: 'searching',
      rejectedDriverIds: [],
      availableDriverPool: drivers.filter(d => d.category === bookingCategory).map(d => d.id),
      originalPrice: finalPrice,
      fare: { amount: finalPrice, currency: 'KES', rideType, vehicleCategory: bookingCategory },
      otpCode: generatedOtp,
      driverArrived: false,
      isStarted: false,
      paymentMethod: selectedPayMethod?.type === 'card' ? 'card' : selectedPayMethod?.type === 'mpesa' ? 'mpesa' : 'cash',
      paymentStatus: 'unpaid',
      mpesaPhone: selectedPayMethod?.mpesaPhone || '',
    };
    setBookings(prev => [newB, ...prev]);
    setPageNumber(15); // Redirect dynamically to Searching Screen
  };

  const handleEmailSignup = async () => {
    if (!signupForm.name || !signupForm.phone || !signupForm.email || !signupForm.password) {
      alert('Please fill in your details to create an account.');
      return;
    }
    if (signUpRole === 'driver') {
      if (!driverVehicleType || !driverCarPlate || !driverCurrentLocation || !driverFrequentLocation) {
        alert('Please fill in all your driver configuration fields (Vehicle Type, Car Plate, Current Location, and Operating Area).');
        return;
      }
    }
    setIsAuthenticating(true);
    setAuthError(null);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, signupForm.email, signupForm.password);
      const fbUser = userCredential.user;
      
      // Update name inside auth system profile
      await updateProfile(fbUser, { displayName: signupForm.name });

      if (signUpRole === 'driver') {
        const newDriver: Driver = {
          id: fbUser.uid,
          name: signupForm.name,
          phone: signupForm.phone,
          vehicleType: driverVehicleType,
          carPlate: driverCarPlate,
          currentLocation: driverCurrentLocation,
          frequentLocation: driverFrequentLocation,
          category: driverCategory,
          rating: 5.0,
          tripsCount: 0,
          isOnline: true,
          isFavorite: false,
          avatarUrl: fbUser.photoURL || 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=200&q=80',
          isRegistered: true
        };
        await setDoc(doc(db, 'drivers', fbUser.uid), newDriver);
        
        // Also seed companion passenger profile
        const newPassenger: Passenger = {
          id: fbUser.uid,
          name: signupForm.name,
          email: signupForm.email,
          phone: signupForm.phone,
          tripsCount: 0,
          rating: 5.0,
          premium: true,
          avatarUrl: fbUser.photoURL || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
          isRegistered: true
        };
        await setDoc(doc(db, 'passengers', fbUser.uid), newPassenger);
        setPassenger(newPassenger);
        
        alert('Congratulations! Driver profile successfully registered & activated on Tripnest Security Mesh.');
        setPageNumber(8);
      } else {
        const newPassenger: Passenger = {
          id: fbUser.uid,
          name: signupForm.name,
          email: signupForm.email,
          phone: signupForm.phone,
          tripsCount: 0,
          rating: 5.0,
          premium: false,
          avatarUrl: fbUser.photoURL || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
          isRegistered: true
        };
        
        await setDoc(doc(db, 'passengers', fbUser.uid), newPassenger);
        setPassenger(newPassenger);
        
        alert('Congratulations! Account built on Firebase Security. Code verified!');
        setPageNumber(5); // Go to phone OTP verification screen
      }
    } catch (err: any) {
      console.error("Firebase Auth Signup Error:", err);
      let msg = err.message;
      if (err.code === 'auth/operation-not-allowed') {
        msg = 'Email/Password accounts are currently turned off in your Firebase console. Please enable the Email/Password sign-in provider in your Firebase project Auth settings, or continue by using the Google Sign-In helper below!';
      } else if (err.code === 'auth/weak-password') {
        msg = 'The password must be at least 6 characters.';
      } else if (err.code === 'auth/email-already-in-use') {
        msg = 'An account with this email address already exists. Try signing in.';
      } else if (err.code === 'auth/invalid-email') {
        msg = 'Please enter a valid email address.';
      }
      setAuthError(msg);
      alert(msg);
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleEmailLogin = async () => {
    if (!loginForm.email || !loginForm.password) {
      alert('Please verify email and password parameters.');
      return;
    }
    setIsAuthenticating(true);
    setAuthError(null);
    try {
      await signInWithEmailAndPassword(auth, loginForm.email, loginForm.password);
      alert('Authenticated securely via Firebase Auth!');
      setPageNumber(8); // Proceed directly to home dashboard map screen
    } catch (err: any) {
      console.error("Firebase Auth Login Error:", err);
      let msg = err.message;
      if (err.code === 'auth/operation-not-allowed') {
        msg = 'Email/Password is disabled in your Firebase console. Please enable the provider under Auth settings, or sign in using Google Auth instead!';
      } else if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        msg = 'The email or password you entered is incorrect. Double check and retry.';
      }
      setAuthError(msg);
      alert(msg);
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsAuthenticating(true);
    setAuthError(null);
    try {
      await signInWithPopup(auth, googleProvider);
      alert('Google authentication connected and verified successfully!');
      setPageNumber(8); // Proceed directly to home dashboard map screen
    } catch (err: any) {
      console.error("Popup blocker or user cancelled login", err);
      if (err.code !== 'auth/popup-closed-by-user') {
        alert(`Google Auth failed: ${err.message}`);
      }
    } finally {
      setIsAuthenticating(false);
    }
  };

  // Helper mock search recommendations
  const recommendations = [
    { name: 'Alchemist Bar & Lounge', loc: 'Westlands, Nairobi' },
    { name: 'Sarit Centre Mall', loc: 'Karuna Road, Westlands' },
    { name: 'Coastal Arena', loc: 'Kilifi Beach Sector' },
    { name: 'Jomo Kenyatta Intl Airport', loc: 'Mombasa Road, Embakasi' }
  ];

  // Process payment for a completed booking
  const processPayment = async (booking: Booking) => {
    if (!booking || booking.paymentStatus === 'paid') return;
    setIsProcessingPayment(true);
    setPaymentStatusMsg(null);
    try {
      if (booking.paymentMethod === 'mpesa') {
        const phone = booking.mpesaPhone || paymentMethods.find(p => p.type === 'mpesa')?.mpesaPhone || '+254712111222';
        const resp = await fetch('/api/mpesa/stkpush', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            phoneNumber: phone,
            amount: booking.fare?.amount || booking.originalPrice,
            bookingId: booking.id,
            userId: auth.currentUser?.uid || passenger.id,
            accountReference: `TRIP-${booking.id.slice(-8)}`,
          }),
        });
        const data = await resp.json();
        if (data.success) {
          setPaymentStatusMsg('M-Pesa STK Push sent! Check your phone and enter PIN.');
        } else {
          setPaymentStatusMsg(`M-Pesa error: ${data.error}`);
        }
      } else if (booking.paymentMethod === 'card') {
        const resp = await fetch('/api/payments/create-intent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            amount: booking.fare?.amount || booking.originalPrice,
            currency: 'usd',
            bookingId: booking.id,
          }),
        });
        const data = await resp.json();
        if (data.success) {
          setPaymentStatusMsg('Card payment processed successfully.');
          setBookings(prev => prev.map(b => b.id === booking.id ? { ...b, paymentStatus: 'paid' as const } : b));
        } else {
          setPaymentStatusMsg(`Card error: ${data.error}`);
        }
      } else {
        setPaymentStatusMsg('Cash payment noted on completion.');
        setBookings(prev => prev.map(b => b.id === booking.id ? { ...b, paymentStatus: 'paid' as const } : b));
      }
    } catch (err: any) {
      setPaymentStatusMsg(`Payment error: ${err.message}`);
    } finally {
      setIsProcessingPayment(false);
    }
  };

  // Load transaction history from the server
  const loadTransactions = async () => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    try {
      const resp = await fetch(`/api/transactions/${uid}`);
      const data = await resp.json();
      if (data.transactions) setTransactions(data.transactions);
    } catch (err) {
      console.error('Failed to load transactions:', err);
    }
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto bg-[#090A0D]/95 text-white scrollbar-none text-left">
      {/* Dynamic Screen Conditional Rendering based on selected page ID */}
      {(() => {
        switch (pageNumber) {
          // ================= ONBOARDING & AUTHENTICATION =================
          case 1: // Welcome/Splash
            return (
              <div className="flex flex-col items-center justify-between h-full p-6 text-center bg-gradient-to-b from-[#090A0E] to-[#111219]">
                <div className="w-full text-right shrink-0">
                  <span className="text-[8px] font-black font-mono text-[#007AFF] uppercase tracking-widest">TRIPNEST PLATFORM</span>
                </div>
                
                <div className="flex flex-col items-center gap-6 w-full flex-grow justify-center my-auto">
                  <div className="w-full max-w-[190px] aspect-square rounded-3xl overflow-hidden border border-zinc-800 shadow-[0_20px_50px_rgba(0,0,0,0.85)] relative group shrink-0">
                    <img
                      src={welcomeHero}
                      alt="Tripnest Luxury Event Transit"
                      className="w-full h-full object-cover group-hover:scale-105 transition-all duration-700"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/30 to-transparent" />
                  </div>
                  
                  <div className="space-y-2 px-2 border-l border-r border-[#007AFF]/10 py-1">
                    <h1 className="font-sans font-black tracking-[0.25em] text-2xl text-white">TRIPNEST</h1>
                    <p className="text-[#007AFF] text-[10px] font-mono font-bold tracking-widest uppercase">Pre-Book Transit Network</p>
                    <p className="text-zinc-300 text-xs font-medium max-w-xs mx-auto font-sans leading-snug">
                      “Pre-book rides without waiting for cabs.”
                    </p>
                  </div>
                </div>

                <div className="w-full space-y-3 shrink-0 pt-4">
                  <button 
                    onClick={() => {
                      setSignUpRole('client');
                      setPageNumber(3);
                    }}
                    className="w-full bg-[#007AFF] hover:bg-[#007AFF]/90 hover:scale-[1.01] text-white font-bold py-3.5 rounded-2xl text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer shadow-lg shadow-[#007AFF]/20"
                    id="btn-book-ride"
                  >
                    <span>Book Ride</span>
                    <ArrowRight className="w-4 h-4 text-white" />
                  </button>

                  <button 
                    onClick={() => {
                      setSignUpRole('driver');
                      setPageNumber(3);
                    }}
                    className="w-full bg-zinc-900 hover:bg-zinc-850 text-zinc-100 hover:scale-[1.01] font-bold py-3.5 rounded-2xl text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all active:scale-95 border border-zinc-800 cursor-pointer"
                    id="btn-become-driver"
                  >
                    <span>Become Driver</span>
                  </button>

                  <button 
                    onClick={() => setPageNumber(41)}
                    className="w-full bg-transparent hover:bg-zinc-900/50 text-zinc-400 hover:text-white transition-all py-2.5 rounded-xl text-xs tracking-wider flex items-center justify-center gap-1.5 cursor-pointer"
                    id="btn-explore-events"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span>Explore Events</span>
                  </button>

                  <div className="text-[10px] text-zinc-500 pt-2 flex justify-center gap-2">
                    <span>Already registered?</span>
                    <button onClick={() => setPageNumber(4)} className="text-[#007AFF] hover:underline font-bold">Log In</button>
                  </div>
                </div>
              </div>
            );

          case 2: // Onboarding / Tutorial Slides
            const slides = [
              { title: 'Elite Event Desinations', desc: 'Secure reliable access to premium festivals, beach events, and VIP venues directly from your device.' },
              { title: 'Secure Dispatch Protocol', desc: 'Realtime cascading algorithm pairs you instantly with verified, highly rated local drivers.' },
              { title: 'Complete Safety Shield', desc: 'Your trip is protected with Verification PINs, secure audio guard recording, and real-time monitoring.' }
            ];
            return (
              <div className="flex flex-col justify-between h-full p-6 bg-[#0E1015]">
                <div className="flex justify-between items-center">
                  <span className="font-mono text-[10px] text-zinc-500 font-bold">SLIDE {tutorialSlide + 1}/3</span>
                  <button onClick={() => setPageNumber(3)} className="text-xs text-zinc-400 hover:text-white uppercase font-bold tracking-widest">Skip</button>
                </div>
                <div className="my-auto space-y-6">
                  <div className="p-6 bg-primary/5 border border-primary/10 rounded-3xl w-20 h-20 flex items-center justify-center mx-auto text-primary">
                    {tutorialSlide === 0 ? <Compass className="w-10 h-10" /> : tutorialSlide === 1 ? <Zap className="w-10 h-10" /> : <ShieldCheck className="w-10 h-10" />}
                  </div>
                  <div className="text-center space-y-2">
                    <h2 className="text-lg font-black tracking-tight text-white">{slides[tutorialSlide].title}</h2>
                    <p className="text-xs text-zinc-400 leading-relaxed font-sans">{slides[tutorialSlide].desc}</p>
                  </div>
                  <div className="flex justify-center gap-1.5">
                    {slides.map((_, i) => (
                      <div key={i} className={`h-1.5 rounded-full transition-all ${i === tutorialSlide ? 'w-6 bg-primary' : 'w-1.5 bg-zinc-800'}`} />
                    ))}
                  </div>
                </div>
                <button 
                  onClick={() => {
                    if (tutorialSlide < 2) {
                      setTutorialSlide(tutorialSlide + 1);
                    } else {
                      setPageNumber(3);
                    }
                  }}
                  className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-3.5 rounded-2xl text-xs uppercase tracking-wider text-center"
                >
                  {tutorialSlide === 2 ? 'Continue to Sign Up' : 'Next Screen'}
                </button>
              </div>
            );

          case 3: // Sign Up
            return (
              <div className="flex flex-col justify-between h-full p-6 bg-[#0E1015]">
                <div className="space-y-4 overflow-y-auto pr-1 scrollbar-none flex-grow">
                  <div>
                    <h2 className="text-lg font-black text-white">Create Account</h2>
                    <p className="text-[11px] text-zinc-400 leading-snug">Join Tripnest to schedule high-priority event transit tickets instantly.</p>
                  </div>
                  
                  {authError && (
                    <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] p-2.5 rounded-xl leading-relaxed">
                      {authError}
                    </div>
                  )}

                  {/* Role selection toggle */}
                  <div className="bg-zinc-900/60 p-3 rounded-2xl border border-zinc-800/80 space-y-2">
                    <label className="text-[10px] uppercase tracking-wider text-zinc-400 font-bold block">Are you registering as a...</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setSignUpRole('client')}
                        className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold transition-all border ${
                          signUpRole === 'client' 
                            ? 'bg-[#007AFF] text-white border-[#007AFF] shadow-sm' 
                            : 'bg-zinc-950 text-zinc-400 border-zinc-800/80 hover:text-white'
                        }`}
                        id="role-client"
                      >
                        <User className="w-3.5 h-3.5" />
                        <span>Client</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setSignUpRole('driver')}
                        className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold transition-all border ${
                          signUpRole === 'driver' 
                            ? 'bg-[#007AFF] text-white border-[#007AFF] shadow-sm' 
                            : 'bg-zinc-950 text-zinc-400 border-zinc-800/80 hover:text-white'
                        }`}
                        id="role-driver"
                      >
                        <Shield className="w-3.5 h-3.5" />
                        <span>Driver</span>
                      </button>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {/* Common fields */}
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase tracking-wider text-zinc-400 font-bold">Full Name</label>
                      <input 
                        type="text" 
                        value={signupForm.name} 
                        onChange={(e)=>setSignupForm({...signupForm, name: e.target.value})}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#007AFF]"
                        placeholder="John Doe"
                        id="signup-name"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase tracking-wider text-zinc-400 font-bold">Safaricom Mobile Number</label>
                      <input 
                        type="text" 
                        value={signupForm.phone} 
                        onChange={(e)=>setSignupForm({...signupForm, phone: e.target.value})}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#007AFF]"
                        placeholder="+254 712 345 678"
                        id="signup-phone"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase tracking-wider text-zinc-400 font-bold">Email Address</label>
                      <input 
                        type="email" 
                        value={signupForm.email} 
                        onChange={(e)=>setSignupForm({...signupForm, email: e.target.value})}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#007AFF]"
                        placeholder="email@example.com"
                        id="signup-email"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase tracking-wider text-zinc-400 font-bold">Secure Password</label>
                      <input 
                        type="password" 
                        value={signupForm.password} 
                        onChange={(e)=>setSignupForm({...signupForm, password: e.target.value})}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#007AFF]"
                        placeholder="••••••••"
                        id="signup-password"
                      />
                    </div>

                    {/* Driver-specific fields */}
                    {signUpRole === 'driver' && (
                      <div className="space-y-3 pt-3 border-t border-zinc-800 mt-3 animate-in slide-in-from-top-1 duration-200">
                        <span className="text-[10px] font-black uppercase tracking-wider text-[#007AFF] block">Driver Vehicle Configuration</span>
                        
                        <div className="space-y-1">
                          <label className="text-[10px] uppercase tracking-wider text-zinc-400 font-bold">Vehicle Model / Type</label>
                          <input 
                            type="text" 
                            value={driverVehicleType} 
                            onChange={(e)=>setDriverVehicleType(e.target.value)}
                            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#007AFF]"
                            placeholder="Tesla Model Y"
                            id="signup-vehicle-type"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] uppercase tracking-wider text-zinc-400 font-bold">Car Plate Number</label>
                          <input 
                            type="text" 
                            value={driverCarPlate} 
                            onChange={(e)=>setDriverCarPlate(e.target.value)}
                            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#007AFF]"
                            placeholder="KDE 847K"
                            id="signup-plate"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] uppercase tracking-wider text-zinc-400 font-bold">Current Location</label>
                          <input 
                            type="text" 
                            value={driverCurrentLocation} 
                            onChange={(e)=>setDriverCurrentLocation(e.target.value)}
                            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#007AFF]"
                            placeholder="Westlands, Nairobi"
                            id="signup-curr-loc"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] uppercase tracking-wider text-zinc-400 font-bold">Frequent Operating Location</label>
                          <input 
                            type="text" 
                            value={driverFrequentLocation} 
                            onChange={(e)=>setDriverFrequentLocation(e.target.value)}
                            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#007AFF]"
                            placeholder="Kilimani & CBD"
                            id="signup-freq-loc"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] uppercase tracking-wider text-zinc-400 font-bold pb-1 block">Vehicle Category</label>
                          <div className="grid grid-cols-3 gap-1.5 pt-0.5">
                            {(['Standard', 'XL', 'Premium'] as const).map((cat) => (
                              <button
                                key={cat}
                                type="button"
                                onClick={() => setDriverCategory(cat)}
                                className={`py-2 px-1 rounded-lg text-[10px] font-bold border transition duration-150 ${
                                  driverCategory === cat 
                                    ? 'bg-[#007AFF] text-white border-[#007AFF] shadow-md shadow-[#007AFF]/10' 
                                    : 'bg-zinc-950 text-zinc-400 border-zinc-800/80 hover:text-white'
                                }`}
                              >
                                {cat}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
 
                <div className="space-y-2 pt-3 shrink-0 bg-[#0E1015]/90 border-t border-zinc-900 mt-2">
                  <button 
                    disabled={isAuthenticating}
                    onClick={handleEmailSignup}
                    className="w-full bg-[#007AFF] hover:bg-[#007AFF]/95 text-white font-bold py-3 rounded-xl text-xs uppercase tracking-wide transition duration-150 disabled:opacity-50"
                  >
                    {isAuthenticating ? 'Provisioning Account...' : signUpRole === 'driver' ? 'Register Premium Driver' : 'Build Premium Profile'}
                  </button>
 
                  <div className="relative my-1 flex py-0.5 items-center">
                    <div className="flex-grow border-t border-zinc-800/40"></div>
                    <span className="flex-shrink mx-2 text-[8px] text-zinc-500 uppercase tracking-widest font-black">Or secure connect</span>
                    <div className="flex-grow border-t border-zinc-800/40"></div>
                  </div>
 
                  <button 
                    disabled={isAuthenticating}
                    onClick={handleGoogleLogin}
                    className="w-full bg-zinc-900 hover:bg-zinc-850 text-white font-bold py-2 rounded-xl text-xs flex items-center justify-center gap-2 border border-zinc-800 transition disabled:opacity-50"
                    id="btn-google-signup"
                  >
                    <svg className="w-3 h-3" viewBox="0 0 24 24">
                      <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fillRule="evenodd" />
                      <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fillRule="evenodd" />
                    </svg>
                    Continue with Google
                  </button>
 
                  <p className="text-center text-[10px] text-zinc-550 pt-1">
                    Already have an account?{' '}
                    <button onClick={() => setPageNumber(4)} className="text-[#007AFF] font-bold hover:underline transition">Log In</button>
                  </p>
                </div>
              </div>
            );

          case 4: // Login Screen
            return (
              <div className="flex flex-col justify-between h-full p-6 bg-[#0E1015]">
                <div className="space-y-4">
                  <h2 className="text-lg font-black text-white">Welcome Back</h2>
                  <p className="text-xs text-zinc-400">Sign in with your credentials to connect local VIP transit.</p>
                  
                  {authError && (
                    <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] p-2.5 rounded-xl leading-relaxed">
                      {authError}
                    </div>
                  )}

                  <div className="space-y-3 pt-2">
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold">Email Address</label>
                      <input 
                        type="text" 
                        value={loginForm.email} 
                        onChange={(e)=>setLoginForm({...loginForm, email: e.target.value})}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-primary"
                        placeholder="your@email.com"
                      />
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between items-center">
                        <label className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold">Password</label>
                        <button className="text-[10px] text-primary font-bold hover:underline">Forgot password?</button>
                      </div>
                      <input 
                        type="password" 
                        value={loginForm.password} 
                        onChange={(e)=>setLoginForm({...loginForm, password: e.target.value})}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-primary"
                        placeholder="••••••••"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-3 pb-2 pt-4 bg-[#0E1015]/90">
                  <button 
                    disabled={isAuthenticating}
                    onClick={handleEmailLogin}
                    className="w-full bg-primary hover:bg-primary/95 text-white font-bold py-3 rounded-xl text-xs uppercase tracking-wide transition disabled:opacity-50"
                  >
                    {isAuthenticating ? 'Authenticating...' : 'Authenticate Securely'}
                  </button>

                  <div className="relative my-2 flex py-1 items-center">
                    <div className="flex-grow border-t border-zinc-805/30"></div>
                    <span className="flex-shrink mx-2 text-[9px] text-zinc-500 uppercase tracking-widest font-bold">Or secure connect</span>
                    <div className="flex-grow border-t border-zinc-805/30"></div>
                  </div>

                  <button 
                    disabled={isAuthenticating}
                    onClick={handleGoogleLogin}
                    className="w-full bg-zinc-900 hover:bg-zinc-850 text-white font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 border border-zinc-800 transition disabled:opacity-50"
                  >
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
                      <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fillRule="evenodd" />
                      <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fillRule="evenodd" />
                    </svg>
                    Continue with Google
                  </button>

                  <p className="text-center text-[10px] text-zinc-500">
                    New user?{' '}
                    <button onClick={() => setPageNumber(3)} className="text-primary font-bold hover:underline transition">Register Account</button>
                  </p>
                </div>
              </div>
            );

          case 5: // Phone verification / OTP
            return (
              <div className="flex flex-col justify-between h-full p-6 bg-[#0E1015]">
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-primary">
                    <ShieldCheck className="w-5 h-5" />
                    <span className="text-[10px] font-black uppercase tracking-wider">SMS Authentication Security</span>
                  </div>
                  <h2 className="text-lg font-black text-white">Enter OTP Verification Code</h2>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    We sent a 4-digit code to <strong className="text-white">{passenger.phone || '+254 712 111 222'}</strong>.
                  </p>
                  <div className="flex gap-3 justify-center py-4">
                    {otpCode.map((char, index) => (
                      <input 
                        key={index}
                        type="text"
                        maxLength={1}
                        value={char}
                        onChange={(e) => {
                          const val = e.target.value.replace(/[^0-9]/g, '');
                          const newOtp = [...otpCode];
                          newOtp[index] = val;
                          setOtpCode(newOtp);
                        }}
                        className="w-12 h-14 bg-zinc-950 border-2 border-zinc-800 rounded-xl text-center text-xl font-bold text-primary focus:outline-none focus:border-primary"
                      />
                    ))}
                  </div>
                  <div className="flex justify-between items-center text-xs text-zinc-500">
                    <span>Resend in 0:48 seconds</span>
                    <button onClick={() => alert('Code resent!')} className="text-primary hover:underline font-bold">Resend SMS Code</button>
                  </div>
                </div>
                <button 
                  onClick={() => {
                    alert('Phone verified successfully!');
                    setPageNumber(6); // Request location
                  }}
                  className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-3.5 rounded-xl text-xs uppercase"
                >
                  Verify Code
                </button>
              </div>
            );

          case 6: // Location Permission Request
            return (
              <div className="flex flex-col justify-between h-full p-6 bg-[#090A0D]">
                <div className="flex-grow flex flex-col items-center justify-center text-center space-y-6">
                  <div className="w-24 h-24 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary relative">
                    <div className="absolute inset-0 bg-primary/5 rounded-full animate-ping" />
                    <MapPin className="w-10 h-10" />
                  </div>
                  <div className="space-y-2">
                    <h2 className="text-lg font-black text-white">Enable Location Services?</h2>
                    <p className="text-xs text-zinc-400 max-w-xs leading-relaxed mx-auto">
                      Tripnest uses high-precision GPS to locate arriving driver guides, optimized routes, and coordinate coastal festival gateways without latency.
                    </p>
                  </div>
                  <div className="bg-zinc-900/50 border border-zinc-850 p-3 rounded-2xl text-[10px] text-zinc-400 text-left space-y-1">
                    <span className="font-bold text-white uppercase block text-[8px] tracking-wider text-primary">PRIVACY COMPLIANT</span>
                    Your real-time coordinates are safely encrypted and are only shared with your driver guide while a journey dispatch is authenticated.
                  </div>
                </div>
                <div className="space-y-2.5">
                  <button 
                    onClick={() => {
                      setLocationPerm('allowed');
                      setPageNumber(7);
                    }}
                    className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-3 rounded-xl text-xs uppercase"
                  >
                    While Using The App
                  </button>
                  <button 
                    onClick={() => {
                      setLocationPerm('always');
                      setPageNumber(7);
                    }}
                    className="w-full bg-zinc-900 border border-zinc-800 hover:bg-zinc-850 text-white font-bold py-3 rounded-xl text-xs uppercase"
                  >
                    Allow Always
                  </button>
                  <button 
                    onClick={() => {
                      setLocationPerm('denied');
                      setPageNumber(7);
                    }}
                    className="w-full text-zinc-500 hover:text-white font-bold text-xs py-2 text-center"
                  >
                    Do Not Allow
                  </button>
                </div>
              </div>
            );

          case 7: // Profile Setup
            return (
              <div className="flex flex-col justify-between h-full p-6 bg-[#0E1015]">
                <div className="space-y-4">
                  <h2 className="text-lg font-black text-white">Setup Profile Portrait</h2>
                  <p className="text-xs text-zinc-400">Add an operating photo avatar for instantaneous identification by your personal transit guide.</p>
                  <div className="flex flex-col items-center gap-3 py-3">
                    <div className="relative group">
                      <img 
                        src={passenger.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80'} 
                        alt="Profile avatar Preview" 
                        className="w-24 h-24 rounded-full object-cover border-2 border-primary" 
                      />
                      <button 
                        onClick={() => {
                          const newUrl = prompt("Enter a custom Unsplash picture image URL:", passenger.avatarUrl);
                          if (newUrl) setPassenger({ ...passenger, avatarUrl: newUrl });
                        }}
                        className="absolute bottom-0 right-0 bg-[#007AFF] text-white p-1.5 rounded-full hover:scale-110 active:scale-95 transition-all shadow-md"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <span className="text-[10px] text-zinc-500 font-bold uppercase">Click plus icon to update photo</span>
                  </div>
                  <div className="space-y-3">
                    <div className="space-y-0.5">
                      <label className="text-[8.5px] font-black uppercase text-zinc-500 tracking-wider">Default Preferred Payment Type</label>
                      <select 
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-primary"
                        onChange={(e) => {
                          alert(`Preferred baseline payment updated to: ${e.target.value}`);
                        }}
                      >
                        <option value="card">SBM Gold Visa Card</option>
                        <option value="mpesa">Safaricom Mobile M-Pesa</option>
                        <option value="cash">Cash Settlement</option>
                      </select>
                    </div>
                  </div>
                </div>
                <button 
                  onClick={() => {
                    alert('Profile setup fully registered! Accessing main system map.');
                    setPageNumber(8); // Go to map view
                  }}
                  className="w-full bg-primary hover:bg-primary/95 text-white font-bold py-3 rounded-xl text-xs uppercase"
                >
                  Enter Platform Experience
                </button>
              </div>
            );

          // ================= RIDE ORDERING CORE FLOW =================
          case 8: // Home Screen (Map View) - Uber-style
            return (
              <div className="flex flex-col justify-between h-full relative bg-[#0A0B0F] overflow-hidden">
                {/* Full screen map as background */}
                <div className="absolute inset-0 z-0">
                  <VirtualMap
                    height="100%"
                    zoom={14}
                    pickup={null}
                    destination={null}
                    hideControls
                  />
                </div>

                {/* Top bar */}
                <div className="relative z-10 px-4 pt-12 flex justify-between items-start">
                  <div className="bg-zinc-950/90 border border-zinc-800 px-3.5 py-2 rounded-full flex items-center gap-2 text-[10px] text-white shadow-lg">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="font-semibold">{passenger.name || 'Rider'}</span>
                  </div>
                  <button
                    onClick={() => setPageNumber(31)}
                    className="bg-zinc-950/90 border border-zinc-800 p-2.5 rounded-full text-white shadow-lg"
                  >
                    <Menu className="w-4 h-4" />
                  </button>
                </div>

                <div className="my-auto pointer-events-none z-10" />

                {/* Bottom sheet - Uber style "Where to?" */}
                <div className="bg-[#121318] border-t border-zinc-800 rounded-t-[24px] relative z-10 shadow-[0_-8px_30px_rgba(0,0,0,0.5)]">
                  <div className="w-9 h-1 bg-zinc-600 mx-auto rounded-full mt-2.5 mb-1" />

                  <div className="p-4 pt-2 space-y-3">
                    {/* Where to? input bar */}
                    <div
                      onClick={() => setPageNumber(9)}
                      className="bg-[#1A1C23] border border-zinc-800 p-3.5 rounded-xl flex items-center gap-3 cursor-pointer active:scale-[0.99] transition"
                    >
                      <Search className="w-4 h-4 text-zinc-400 shrink-0" />
                      <span className="text-sm text-zinc-400 font-medium">Where to?</span>
                    </div>

                    {/* Quick shortcuts */}
                    <div className="grid grid-cols-2 gap-2.5">
                      {savedPlaces.slice(0, 4).map((pl) => (
                        <div
                          key={pl.id}
                          onClick={() => {
                            setSearchQuery({ ...searchQuery, dropoff: pl.value });
                            setPageNumber(11);
                          }}
                          className="bg-[#1A1C23] border border-zinc-800 p-3 rounded-xl flex items-center gap-2.5 cursor-pointer hover:border-[#007AFF]/40 transition"
                        >
                          <div className="p-2 bg-[#007AFF]/10 rounded-lg shrink-0">
                            <MapPin className="w-3.5 h-3.5 text-[#007AFF]" />
                          </div>
                          <div className="text-left min-w-0">
                            <span className="text-[11px] font-bold text-white block truncate">{pl.name}</span>
                            <span className="text-[8px] text-zinc-500 block truncate">{pl.value}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            );

          case 9: // Search / Destination Input Page
            return (
              <div className="flex flex-col justify-between h-full bg-[#0E1015]">
                <div>
                  {/* Top search headers */}
                  <header className="p-4 bg-[#0A0C10] border-b border-zinc-850 flex items-center gap-3">
                    <button onClick={() => setPageNumber(8)} className="p-1 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white">
                      <X className="w-4 h-4" />
                    </button>
                    <h2 className="text-xs font-black uppercase tracking-widest text-white">Specify Destination</h2>
                  </header>

                  {/* Input form */}
                  <div className="p-4 bg-zinc-950/80 border-b border-zinc-900 space-y-3">
                    <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-850 px-3 py-1.5 rounded-xl">
                      <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                      <input 
                        type="text" 
                        value={searchQuery.pickup} 
                        onChange={(e)=>setSearchQuery({...searchQuery, pickup: e.target.value})}
                        className="bg-transparent text-xs text-white focus:outline-none flex-grow"
                        placeholder="Pickup current location"
                      />
                    </div>
                    <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-850 px-3 py-1.5 rounded-xl">
                      <div className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse" />
                      <input 
                        type="text" 
                        value={searchQuery.dropoff} 
                        onChange={(e)=>setSearchQuery({...searchQuery, dropoff: e.target.value})}
                        className="bg-transparent text-xs text-white focus:outline-none flex-grow"
                        placeholder="Where to? (e.g., Alchemist Bar, Kilifi Beach)"
                        autoFocus
                      />
                    </div>
                  </div>

                  {/* Recommendations */}
                  <div className="p-4 space-y-3">
                    <span className="text-[9px] font-black tracking-wider text-zinc-500 uppercase block font-mono">Suggested Event Destinations</span>
                    <div className="space-y-1.5">
                      {recommendations.map((rec, i) => (
                        <div 
                          key={i}
                          onClick={() => {
                            setSearchQuery({ ...searchQuery, dropoff: rec.name });
                            setPageNumber(11); // Switch to Select Vehicle list
                          }}
                          className="p-3 bg-zinc-900/60 border border-zinc-850 rounded-xl hover:border-primary/40 transition-all flex items-center gap-3 cursor-pointer text-left"
                        >
                          <div className="p-1.5 bg-[#007AFF]/10 text-primary rounded-lg">
                            <MapPin className="w-4 h-4" />
                          </div>
                          <div className="leading-none text-left">
                            <span className="font-bold text-xs text-white block">{rec.name}</span>
                            <span className="text-[10px] text-zinc-500 block mt-0.5">{rec.loc}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="p-4 border-t border-zinc-900">
                  <button 
                    onClick={() => {
                      if (!searchQuery.dropoff) {
                        alert('Please fill out a valid drop-off destination.');
                        return;
                      }
                      setPageNumber(11); // Go to vehicle categories list
                    }}
                    className="w-full bg-primary hover:bg-primary/95 text-white font-bold py-3 rounded-xl text-xs uppercase"
                  >
                    Load Vehicle Options
                  </button>
                </div>
              </div>
            );

          case 10: // Saved Places Page
            return (
              <div className="flex flex-col justify-between h-full bg-[#0E1015] p-5">
                <div className="space-y-4">
                  <div className="flex items-center gap-2 pb-2 border-b border-zinc-850">
                    <Bookmark className="w-4 h-4 text-primary" />
                    <h2 className="text-xs font-black uppercase tracking-wider text-white">Configure Saved Bookmarks</h2>
                  </div>

                  {/* Saved Spaces List */}
                  <div className="space-y-2">
                    {savedPlaces.map((pl) => (
                      <div key={pl.id} className="p-3 bg-zinc-900 border border-zinc-850 rounded-xl flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-zinc-950 rounded-lg text-primary">
                            <MapPin className="w-4 h-4 animate-pulse" />
                          </div>
                          <div className="text-left">
                            <span className="font-bold text-xs text-white">{pl.name}</span>
                            <span className="text-[10px] text-zinc-500 block mt-0.5">{pl.value}</span>
                          </div>
                        </div>
                        <button 
                          onClick={() => setSavedPlaces(savedPlaces.filter(p => p.id !== pl.id))}
                          className="p-1.5 bg-red-950/30 hover:bg-red-900/60 text-red-400 rounded-lg transition-all"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Add Custom Place Form */}
                  <div className="bg-zinc-950 border border-zinc-900 p-3.5 rounded-2xl space-y-2.5">
                    <span className="text-[9px] uppercase font-black tracking-wider text-primary block">Create New Location Shortcut</span>
                    <input 
                      type="text"
                      placeholder="Bookmark title (e.g. Gym, Client)"
                      value={newPlace.name}
                      onChange={(e)=>setNewPlace({...newPlace, name: e.target.value})}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-white"
                    />
                    <input 
                      type="text"
                      placeholder="Exact transport address"
                      value={newPlace.value}
                      onChange={(e)=>setNewPlace({...newPlace, value: e.target.value})}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-white"
                    />
                    <button 
                      onClick={() => {
                        if (!newPlace.name || !newPlace.value) {
                          alert('Please specify name and location parameters.');
                          return;
                        }
                        setSavedPlaces([...savedPlaces, { id: Date.now().toString(), name: newPlace.name, icon: 'MapPin', value: newPlace.value }]);
                        setNewPlace({ name: '', value: '' });
                        alert('Location bookmark customized!');
                      }}
                      className="w-full bg-primary/20 hover:bg-primary text-primary hover:text-white py-1.5 rounded-lg text-[10px] font-black uppercase transition-all"
                    >
                      Store Bookmark
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <button onClick={() => setPageNumber(8)} className="w-full bg-zinc-900 border border-zinc-800 py-3.5 rounded-xl text-xs uppercase font-bold text-center">
                    Return to home
                  </button>
                </div>
              </div>
            );

          case 11: // Ride Options/Selection Page - Uber-style car selector with price card
            const options = [
              { key: 'Standard', name: 'Green Eco', desc: 'Nissan Leaf / Tesla Model 3', price: 15, eta: '8 min', icon: '🚗', badge: 'ECONOMY' },
              { key: 'XL', name: 'Elite XL Van', desc: 'Toyota Alphard / Mercedes V-Class', price: 25, eta: '6 min', icon: '🚐', badge: 'XL' },
              { key: 'Premium', name: 'Premium Black', desc: 'Black Tesla Y / Porsche Macan', price: 45, eta: '4 min', icon: '🏎️', badge: 'PREMIUM' }
            ];
            const selectedOpt = options.find(o => o.key === bookingCategory) || options[2];
            return (
              <div className="flex flex-col justify-between h-full bg-[#0A0B0F] relative overflow-hidden">
                <div className="absolute inset-0 z-0">
                  <VirtualMap
                    height="100%"
                    zoom={13}
                    pickup={{ lat: -1.2921, lng: 36.8219, label: searchQuery.pickup }}
                    destination={{ lat: -1.305, lng: 36.85, label: searchQuery.dropoff || 'Destination' }}
                    hideControls
                  />
                </div>

                <div className="relative z-10 p-4 pt-12">
                  <button onClick={() => setPageNumber(8)} className="bg-zinc-950/90 border border-zinc-800 p-2.5 rounded-full text-white shadow-lg">
                    <ArrowRight className="w-4 h-4 rotate-180" />
                  </button>
                </div>

                <div className="my-auto pointer-events-none z-10" />

                <div className="bg-[#121318] border-t border-zinc-800 rounded-t-[24px] relative z-10 shadow-[0_-8px_30px_rgba(0,0,0,0.5)]">
                  <div className="w-9 h-1 bg-zinc-600 mx-auto rounded-full mt-2.5 mb-1" />

                  <div className="px-4 pb-2">
                    <div className="flex items-center gap-2 text-[11px] text-zinc-400 mb-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#007AFF]" />
                      <span className="truncate font-medium">{searchQuery.pickup}</span>
                      <span className="text-zinc-600">→</span>
                      <div className="w-1.5 h-1.5 rounded-full bg-zinc-500" />
                      <span className="truncate font-medium">{searchQuery.dropoff || 'Destination'}</span>
                    </div>
                  </div>

                  <div className="px-4 pb-2 space-y-1.5 max-h-[180px] overflow-y-auto">
                    {options.map((opt) => (
                      <div
                        key={opt.key}
                        onClick={() => setBookingCategory(opt.key as any)}
                        className={`flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
                          bookingCategory === opt.key
                            ? 'bg-[#007AFF]/10 border-[#007AFF] shadow-sm shadow-[#007AFF]/10'
                            : 'bg-[#1A1C23] border-zinc-800 hover:border-zinc-700'
                        }`}
                      >
                        <div className="text-xl w-10 h-10 flex items-center justify-center rounded-lg bg-zinc-900/80 shrink-0">
                          {opt.icon}
                        </div>
                        <div className="flex-1 min-w-0 text-left">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[13px] font-bold text-white">{opt.name}</span>
                            <span className="text-[7px] font-black text-[#007AFF] bg-[#007AFF]/10 px-1.5 py-0.5 rounded uppercase">{opt.badge}</span>
                          </div>
                          <span className="text-[10px] text-zinc-500 block">{opt.desc}</span>
                          <span className="text-[9px] text-zinc-600 block">{opt.eta} away</span>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="text-[15px] font-black text-white">${opt.price}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Price confirmation card */}
                  <div className="px-4 pb-2">
                    {isCalculatingPrice ? (
                      <div className="bg-[#1A1C23] border border-zinc-800 rounded-xl p-4 flex items-center justify-center gap-2">
                        <div className="w-4 h-4 border-2 border-[#007AFF] border-t-transparent rounded-full animate-spin" />
                        <span className="text-xs text-zinc-400">Calculating fare...</span>
                      </div>
                    ) : priceError ? (
                      <div className="bg-red-950/20 border border-red-500/20 rounded-xl p-3 text-center">
                        <p className="text-[11px] text-red-400">{priceError}</p>
                      </div>
                    ) : calculatedFare !== null ? (
                      <div className="bg-[#0F1117] border border-zinc-800 rounded-xl p-4 space-y-2">
                        <div className="flex items-center justify-between text-[11px] text-zinc-400">
                          <span className="font-medium">{searchQuery.pickup} → {searchQuery.dropoff}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-zinc-500">{bookingCategory} · {rideType === 'Private' ? 'Private Ride' : 'Shared Ride'}</span>
                          <div className="text-right">
                            <span className="text-xl font-black text-white">KES {calculatedFare}</span>
                            {rideType === 'Cost Sharing' && (
                              <p className="text-[9px] text-emerald-400">Split with other passengers</p>
                            )}
                          </div>
                        </div>
                      </div>
                    ) : null}
                  </div>

                  <div className="p-4 pt-2 space-y-2">
                    <div className="flex items-center justify-between text-[11px]">
                      <div className="flex items-center gap-1.5 text-zinc-400">
                        <Clock className="w-3.5 h-3.5" />
                        <span>Now</span>
                      </div>
                      <button onClick={() => setPageNumber(12)} className="text-[#007AFF] font-semibold text-[10px]">
                        Schedule for later
                      </button>
                    </div>
                    <button
                      onClick={handleLaunchSearch}
                      disabled={calculatedFare === null || isCalculatingPrice || !!priceError}
                      className="w-full bg-[#007AFF] hover:bg-[#007AFF]/90 disabled:bg-zinc-700 disabled:text-zinc-500 text-white font-bold py-3.5 rounded-xl text-sm tracking-wide shadow-lg shadow-[#007AFF]/20 active:scale-[0.98] transition disabled:shadow-none disabled:cursor-not-allowed"
                    >
                      {isCalculatingPrice ? 'Calculating...' : priceError ? 'Cannot book' : rideType === 'Private' ? 'Confirm Booking' : 'Confirm Shared Ride'}
                    </button>
                  </div>
                </div>
              </div>
            );

          case 12: // Ride Details/Post Confirmation Page - Uber-style receipt
            const baseValue = bookingCategory === 'Premium' ? 45 : bookingCategory === 'XL' ? 25 : 15;
            const savingsValue = Math.round(baseValue * promoDiscount / 100);
            const totalFareValue = Math.max(5, baseValue - savingsValue);
            return (
              <div className="flex flex-col justify-between h-full bg-[#0E1015] p-5">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <button onClick={() => setPageNumber(11)} className="p-1 hover:bg-zinc-800 rounded-lg text-zinc-400">
                      <ArrowRight className="w-4 h-4 rotate-180" />
                    </button>
                    <h2 className="text-xs font-bold text-white">Review trip</h2>
                    <div className="w-6" />
                  </div>

                  {/* Pickup → Destination */}
                  <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-4 space-y-3.5 text-left">
                    <div className="flex items-start gap-3">
                      <div className="flex flex-col items-center gap-0.5 pt-0.5">
                        <div className="w-2 h-2 rounded-full bg-[#007AFF]" />
                        <div className="w-[1.5px] h-6 bg-zinc-700" />
                        <div className="w-2 h-2 rounded-full bg-zinc-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] text-zinc-500 font-medium">Pickup</p>
                        <p className="text-[13px] text-white font-medium truncate">{searchQuery.pickup}</p>
                        <p className="text-[10px] text-zinc-500 font-medium mt-2">Destination</p>
                        <p className="text-[13px] text-white font-medium truncate">{searchQuery.dropoff || 'Destination'}</p>
                      </div>
                    </div>
                  </div>

                  {/* Fare breakdown */}
                  <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-4 space-y-2 text-[12px] text-left">
                    <div className="flex justify-between text-zinc-400">
                      <span>{bookingCategory} • {rideType === 'Private' ? 'Private' : 'Shared'}</span>
                      <span className="text-white">${baseValue}.00</span>
                    </div>
                    {promoDiscount > 0 && (
                      <div className="flex justify-between text-emerald-400">
                        <span>Promo discount</span>
                        <span>-${savingsValue}.00</span>
                      </div>
                    )}
                    <div className="border-t border-zinc-800 pt-2 flex justify-between font-bold text-white">
                      <span>Total</span>
                      <span className="text-[#007AFF]">${totalFareValue}.00</span>
                    </div>
                  </div>

                  {/* Coupon */}
                  <div onClick={() => setPageNumber(14)} className="flex items-center justify-between p-3 bg-zinc-950 border border-zinc-900 rounded-xl cursor-pointer">
                    <div className="flex items-center gap-2">
                      <Gift className="w-4 h-4 text-zinc-500" />
                      <span className="text-[11px] text-zinc-400">Have a coupon?</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-zinc-500" />
                  </div>
                </div>

                <div className="space-y-3 pt-4">
                  <button
                    onClick={handleLaunchSearch}
                    className="w-full bg-[#007AFF] hover:bg-[#007AFF]/90 text-white font-bold py-3.5 rounded-xl text-sm shadow-lg shadow-[#007AFF]/20 active:scale-[0.98] transition"
                  >
                    {customDateTime ? 'Schedule Trip' : 'Request Ride'}
                  </button>
                  <button onClick={() => setPageNumber(11)} className="w-full text-zinc-500 hover:text-zinc-300 py-1.5 text-xs font-medium text-center">
                    Back
                  </button>
                </div>
              </div>
            );

          case 13: // Payment Method Selection - functional M-Pesa + Card
            return (
              <div className="flex flex-col justify-between h-full bg-[#0E1015] p-5">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <button onClick={() => setPageNumber(11)} className="p-1 hover:bg-zinc-800 rounded-lg text-zinc-400">
                      <ArrowRight className="w-4 h-4 rotate-180" />
                    </button>
                    <h2 className="text-xs font-bold text-white">Payment method</h2>
                    <div className="w-6" />
                  </div>

                  <div className="space-y-2">
                    {paymentMethods.map((pm) => (
                      <div key={pm.id}>
                        <div
                          onClick={() => setSelectedPaymentId(pm.id)}
                          className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between text-left ${
                            selectedPaymentId === pm.id
                              ? 'bg-[#007AFF]/10 border-[#007AFF] text-white'
                              : 'bg-zinc-900 border-zinc-850 text-zinc-400 hover:border-zinc-700'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${pm.type === 'card' ? 'bg-zinc-800' : 'bg-emerald-900/30'}`}>
                              {pm.type === 'card' ? (
                                <CreditCard className="w-5 h-5 text-[#007AFF]" />
                              ) : (
                                <Smartphone className="w-5 h-5 text-emerald-400" />
                              )}
                            </div>
                            <div>
                              <span className="font-bold text-sm block text-white">{pm.label}</span>
                              <span className="text-[11px] text-zinc-500 block mt-0.5">{pm.details}</span>
                            </div>
                          </div>
                          {selectedPaymentId === pm.id && (
                            <div className="w-5 h-5 rounded-full bg-[#007AFF] flex items-center justify-center">
                              <Check className="w-3 h-3 text-white" />
                            </div>
                          )}
                        </div>

                        {/* M-Pesa phone input when selected */}
                        {selectedPaymentId === pm.id && pm.type === 'mpesa' && (
                          <div className="mt-2 p-3 bg-zinc-950 border border-zinc-800 rounded-xl">
                            <label className="text-[9px] font-black uppercase text-zinc-500 block mb-1.5 font-mono">M-Pesa phone number</label>
                            <div className="flex gap-2">
                              <input
                                type="tel"
                                value={mpesaPhoneInput}
                                onChange={(e) => {
                                  setMpesaPhoneInput(e.target.value);
                                  setPaymentMethods(prev => prev.map(p =>
                                    p.id === pm.id ? { ...p, mpesaPhone: e.target.value, details: e.target.value } : p
                                  ));
                                }}
                                placeholder="+2547XXXXXXXX"
                                className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-[#007AFF]"
                              />
                            </div>
                            <p className="text-[8px] text-zinc-600 mt-1.5">You'll receive an STK Push on this number to complete payment after the trip.</p>
                          </div>
                        )}

                        {/* Stripe card info when selected */}
                        {selectedPaymentId === pm.id && pm.type === 'card' && (
                          <div className="mt-2 p-3 bg-zinc-950 border border-zinc-800 rounded-xl">
                            <label className="text-[9px] font-black uppercase text-zinc-500 block mb-1.5 font-mono">Card details</label>
                            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-[11px] text-zinc-400">
                              <div className="flex items-center gap-2">
                                <CreditCard className="w-4 h-4 text-[#007AFF]" />
                                <span>{pm.details}</span>
                              </div>
                              <p className="text-[9px] text-zinc-600 mt-1.5">Securely saved. Charged automatically after trip completion via Stripe.</p>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Add new payment method */}
                  <div className="pt-2">
                    <button
                      onClick={() => {
                        const method = prompt('Add (card) or (mpesa)?')?.toLowerCase();
                        if (method === 'card') {
                          const label = prompt('Card label (e.g. Visa Platinum):');
                          const last4 = prompt('Last 4 digits:');
                          if (label && last4) {
                            setPaymentMethods([...paymentMethods, {
                              id: `pm-${Date.now()}`, type: 'card', label,
                              details: `•••• ${last4}`, isDefault: false, stripePaymentMethodId: ''
                            }]);
                          }
                        } else if (method === 'mpesa') {
                          const phone = prompt('M-Pesa phone (e.g. +254712345678):');
                          if (phone) {
                            setPaymentMethods([...paymentMethods, {
                              id: `pm-${Date.now()}`, type: 'mpesa', label: 'M-Pesa Mobile',
                              details: phone, isDefault: false, mpesaPhone: phone
                            }]);
                          }
                        }
                      }}
                      className="w-full bg-zinc-900 border border-dashed border-zinc-700 hover:border-[#007AFF]/50 text-zinc-400 hover:text-white py-3 rounded-xl text-xs font-medium transition flex items-center justify-center gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Add payment method</span>
                    </button>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setPageNumber(11);
                  }}
                  className="w-full bg-[#007AFF] hover:bg-[#007AFF]/90 text-white font-bold py-3 rounded-xl text-sm shadow-lg shadow-[#007AFF]/20 active:scale-[0.98] transition"
                >
                  Done
                </button>
              </div>
            );

          case 14: // Promo Code/Discount Input Page
            return (
              <div className="flex flex-col justify-between h-full bg-[#0E1015] p-5">
                <div className="space-y-4">
                  <header className="pb-1 border-b border-zinc-850">
                    <h2 className="text-xs font-black uppercase tracking-wider text-[#007AFF]">Apply Promotion Code</h2>
                  </header>

                  <div className="space-y-3 pt-2">
                    <p className="text-xs text-zinc-400">Enter coupon or discount voucher keys to deduct percentages from event ride orders immediately.</p>
                    <div className="flex gap-2">
                      <input 
                        type="text"
                        value={searchPromoText}
                        onChange={(e)=>setSearchPromoText(e.target.value)}
                        placeholder="e.g. TRIPHOST50, VIPNIGHT"
                        className="flex-grow bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2.5 text-xs text-white uppercase font-bold focus:outline-none focus:border-primary"
                      />
                      <button 
                        onClick={() => {
                          const code = searchPromoText.trim().toUpperCase();
                          if (code === 'TRIPHOST50') {
                            setPromoDiscount(50);
                            setSelectedPromo('TRIPHOST50');
                            alert('Voucher validated successfully: 50% Exclusive Discount Applied!');
                          } else if (code === 'ECOLUXE') {
                            setPromoDiscount(20);
                            setSelectedPromo('ECOLUXE');
                            alert('Voucher validated successfully: 20% Eco-Luxe Discount Applied!');
                          } else {
                            alert('Invalid coupon key code or voucher is expired. Please try again.');
                          }
                        }}
                        className="bg-primary hover:bg-primary/90 text-white text-xs font-bold px-4 rounded-xl uppercase"
                      >
                        Apply
                      </button>
                    </div>

                    {/* Pre-configured rewards lists */}
                    <div className="pt-3 space-y-2">
                      <span className="text-[9px] uppercase font-black text-zinc-500 block">Available Campaign Vouchers</span>
                      <div 
                        onClick={() => {
                          setSearchPromoText('TRIPHOST50');
                        }}
                        className="p-3 bg-zinc-900/60 border border-zinc-850 rounded-xl cursor-pointer hover:border-primary/40 text-left transition"
                      >
                        <div className="flex justify-between font-bold text-xs text-shawn-cyan">
                          <span className="text-white">TRIPHOST50</span>
                          <span className="text-primary">-50% OFF</span>
                        </div>
                        <p className="text-[10px] text-zinc-500 mt-1">Exclusive first-ride discount for Tripnest member candidates.</p>
                      </div>
                    </div>
                  </div>
                </div>

                <button 
                  onClick={() => setPageNumber(12)} // Switch back to confirmation sheet
                  className="w-full bg-[#1A1B22] border border-zinc-805 text-white font-bold py-3 rounded-xl text-xs uppercase"
                >
                  Return to Ride confirmation
                </button>
              </div>
            );

          case 15: // Searching for Driver - Uber-style
            return (
              <div className="flex flex-col justify-between h-full bg-[#0A0B0F] relative overflow-hidden">
                {/* Map background */}
                <div className="absolute inset-0 z-0">
                  <VirtualMap
                    height="100%"
                    zoom={14}
                    pickup={{ lat: -1.2921, lng: 36.8219 }}
                    destination={{ lat: -1.305, lng: 36.85 }}
                    hideControls
                  />
                </div>

                {/* Top bar with cancel */}
                <div className="relative z-10 p-4 pt-12">
                  <button
                    onClick={() => {
                      if (bookings.length > 0) cancelActiveTrip(bookings[0].id);
                      setPageNumber(8);
                    }}
                    className="bg-zinc-950/90 border border-zinc-800 px-4 py-2 rounded-full text-white text-xs font-medium shadow-lg"
                  >
                    Cancel
                  </button>
                </div>

                {/* Bottom sheet - Searching */}
                <div className="bg-[#121318] border-t border-zinc-800 rounded-t-[24px] relative z-10 shadow-[0_-8px_30px_rgba(0,0,0,0.5)]">
                  <div className="w-9 h-1 bg-zinc-600 mx-auto rounded-full mt-2.5 mb-1" />

                  <div className="p-5 pt-3 space-y-4">
                    {/* Searching animation */}
                    <div className="flex items-center gap-4">
                      <div className="relative w-14 h-14 shrink-0">
                        <div className="absolute inset-0 bg-[#007AFF]/20 rounded-full animate-ping" />
                        <div className="relative w-full h-full bg-[#007AFF]/10 border-2 border-[#007AFF] rounded-full flex items-center justify-center">
                          <Search className="w-6 h-6 text-[#007AFF] animate-spin" style={{ animationDuration: '3s' }} />
                        </div>
                      </div>
                      <div className="text-left">
                        <h3 className="text-sm font-bold text-white">Finding your driver</h3>
                        <p className="text-[11px] text-zinc-400 mt-0.5">Searching nearby {bookingCategory} vehicles...</p>
                      </div>
                    </div>

                    {/* Progress dots */}
                    <div className="flex gap-1.5 justify-center py-1">
                      {[0, 1, 2, 3, 4].map((i) => (
                        <div
                          key={i}
                          className="w-1.5 h-1.5 rounded-full bg-[#007AFF] animate-pulse"
                          style={{ animationDelay: `${i * 0.3}s`, opacity: 0.3 + i * 0.15 }}
                        />
                      ))}
                    </div>

                    {/* Simulate match button */}
                    <button
                      onClick={() => {
                        if (bookings.length > 0 && bookings[0].status === 'searching') {
                          setBookings(prev => prev.map((b, i) => i === 0 ? { ...b, status: 'en_route', driverId: 'driver-marcus' } : b));
                          setPageNumber(16);
                        } else {
                          setPageNumber(8);
                        }
                      }}
                      className="w-full bg-[#007AFF] hover:bg-[#007AFF]/90 text-white font-bold py-3 rounded-xl text-xs shadow-lg shadow-[#007AFF]/20 active:scale-[0.98] transition"
                    >
                      Simulate: Match Driver
                    </button>
                  </div>
                </div>
              </div>
            );

          case 16: // Driver Matched - Uber-style
            const matchedDriver = drivers.find(d => d.id === activeBooking?.driverId) || drivers[0];
            return (
              <div className="flex flex-col justify-between h-full bg-[#0A0B0F] relative overflow-hidden">
                {/* Map background with driver */}
                <div className="absolute inset-0 z-0">
                  <VirtualMap
                    height="100%"
                    zoom={15}
                    pickup={{ lat: -1.2921, lng: 36.8219, label: activeBooking?.pickup }}
                    destination={{ lat: -1.305, lng: 36.85, label: activeBooking?.destination }}
                    driverLocation={{ lat: -1.288, lng: 36.825, heading: 45 }}
                    hideControls
                  />
                </div>

                {/* Top bar */}
                <div className="relative z-10 p-4 pt-12 flex justify-between items-start">
                  <button onClick={() => setPageNumber(15)} className="bg-zinc-950/90 border border-zinc-800 p-2.5 rounded-full text-white shadow-lg">
                    <ArrowRight className="w-4 h-4 rotate-180" />
                  </button>
                  <div className="bg-zinc-950/90 border border-zinc-800 px-3 py-1.5 rounded-full text-[10px] text-emerald-400 font-bold shadow-lg">
                    Driver assigned
                  </div>
                </div>

                <div className="my-auto pointer-events-none z-10" />

                {/* Bottom sheet - Driver info */}
                <div className="bg-[#121318] border-t border-zinc-800 rounded-t-[24px] relative z-10 shadow-[0_-8px_30px_rgba(0,0,0,0.5)]">
                  <div className="w-9 h-1 bg-zinc-600 mx-auto rounded-full mt-2.5 mb-1" />

                  <div className="p-4 pt-2 space-y-3">
                    {/* Driver card */}
                    <div className="flex items-center gap-3.5 bg-[#1A1C23] border border-zinc-800 p-3.5 rounded-xl">
                      <img
                        src={matchedDriver?.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80'}
                        alt={matchedDriver?.name}
                        className="w-12 h-12 rounded-full object-cover border-2 border-[#007AFF] shrink-0"
                      />
                      <div className="flex-1 text-left min-w-0">
                        <h4 className="text-sm font-bold text-white">{matchedDriver?.name || 'Marcus'}</h4>
                        <p className="text-[11px] text-zinc-400">{matchedDriver?.vehicleType || 'Tesla Model 3'}</p>
                        <p className="text-[9px] text-zinc-500 font-mono">{matchedDriver?.carPlate || 'TRP-NEST 01'}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-[#007AFF] font-bold text-xs">★ {matchedDriver?.rating || 4.9}</div>
                        <div className="text-[9px] text-zinc-500">{matchedDriver?.tripsCount || 1485} trips</div>
                      </div>
                    </div>

                    {/* ETA and actions */}
                    <div className="flex items-center justify-between text-[12px] text-zinc-400">
                      <div className="flex items-center gap-1.5">
                        <Navigation className="w-3.5 h-3.5 text-[#007AFF]" />
                        <span className="text-white font-semibold">4 min</span>
                        <span>away</span>
                      </div>
                      <button onClick={() => setPageNumber(22)} className="text-[#007AFF] font-medium flex items-center gap-1">
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>Contact</span>
                      </button>
                    </div>

                    <button
                      onClick={() => setPageNumber(17)}
                      className="w-full bg-[#007AFF] hover:bg-[#007AFF]/90 text-white font-bold py-3 rounded-xl text-sm shadow-lg shadow-[#007AFF]/20 active:scale-[0.98] transition"
                    >
                      Track driver
                    </button>
                  </div>
                </div>
              </div>
            );

          // ================= LIVE RIDE TRACKING =================
          case 17: // Driver En Route - Uber-style tracking
            const trackDriver = drivers.find(d => d.id === activeBooking?.driverId) || drivers[0];
            return (
              <div className="flex flex-col justify-between h-full bg-[#0A0B0F] relative overflow-hidden">
                {/* Full-screen tracking map */}
                <div className="absolute inset-0 z-0">
                  <VirtualMap
                    height="100%"
                    zoom={15}
                    pickup={{ lat: -1.2921, lng: 36.8219, label: activeBooking?.pickup }}
                    destination={{ lat: -1.305, lng: 36.85, label: activeBooking?.destination }}
                    driverLocation={{ lat: -1.289, lng: 36.823, heading: 90 }}
                    routePath={[
                      { lat: -1.289, lng: 36.823 },
                      { lat: -1.290, lng: 36.825 },
                      { lat: -1.291, lng: 36.826 },
                      { lat: -1.292, lng: 36.822 },
                      { lat: -1.2921, lng: 36.8219 },
                    ]}
                    hideControls
                  />
                </div>

                {/* Top bar */}
                <div className="relative z-10 p-4 pt-12 flex justify-between items-start">
                  <div className="bg-zinc-950/90 border border-zinc-800 px-4 py-2 rounded-full text-[11px] text-white shadow-lg flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="font-medium">Driver incoming</span>
                  </div>
                  <div className="bg-[#007AFF]/20 border border-[#007AFF]/30 px-3 py-1.5 rounded-full text-[11px] text-[#007AFF] font-bold shadow-lg">
                    4 min
                  </div>
                </div>

                <div className="my-auto pointer-events-none z-10" />

                {/* Bottom sheet - driver tracking */}
                <div className="bg-[#121318] border-t border-zinc-800 rounded-t-[24px] relative z-10 shadow-[0_-8px_30px_rgba(0,0,0,0.5)]">
                  <div className="w-9 h-1 bg-zinc-600 mx-auto rounded-full mt-2.5 mb-1" />

                  <div className="p-4 pt-2 space-y-3">
                    {/* Trip progress steps */}
                    <div className="flex items-center justify-between px-2">
                      {[
                        { label: 'Pickup', done: true },
                        { label: 'En route', done: true, active: true },
                        { label: 'Dropoff', done: false },
                      ].map((step, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${step.done ? 'bg-[#007AFF]' : step.active ? 'bg-[#007AFF] animate-pulse' : 'bg-zinc-700'}`} />
                          <span className={`text-[10px] ${step.done || step.active ? 'text-white font-medium' : 'text-zinc-500'}`}>{step.label}</span>
                        </div>
                      ))}
                    </div>

                    {/* Driver info bar */}
                    <div className="flex items-center gap-3 bg-[#1A1C23] border border-zinc-800 p-3 rounded-xl">
                      <img
                        src={trackDriver?.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80'}
                        alt={trackDriver?.name}
                        className="w-10 h-10 rounded-full object-cover border border-zinc-700 shrink-0"
                      />
                      <div className="flex-1 text-left min-w-0">
                        <p className="text-sm font-bold text-white">{trackDriver?.name || 'Marcus'}</p>
                        <p className="text-[10px] text-zinc-400">{trackDriver?.vehicleType || 'Tesla Model 3'} • {trackDriver?.carPlate || 'TRP-NEST 01'}</p>
                      </div>
                      <button onClick={() => setPageNumber(22)} className="p-2.5 bg-[#007AFF]/10 rounded-lg text-[#007AFF]">
                        <MessageSquare className="w-4 h-4" />
                      </button>
                    </div>

                    {/* ETA detail */}
                    <div className="flex items-center justify-between text-[12px]">
                      <div className="flex items-center gap-1.5 text-zinc-400">
                        <Navigation className="w-3.5 h-3.5 text-[#007AFF]" />
                        <span className="text-white font-bold">0.8 mi</span>
                        <span>from pickup</span>
                      </div>
                      <button onClick={() => setPageNumber(18)} className="text-[#007AFF] text-xs font-medium">
                        Simulate arrival
                      </button>
                    </div>

                    {/* Action buttons */}
                    <div className="flex gap-2">
                      <button onClick={() => setPageNumber(18)} className="flex-1 bg-[#007AFF] hover:bg-[#007AFF]/90 text-white font-semibold py-2.5 rounded-xl text-xs shadow-lg shadow-[#007AFF]/20 active:scale-[0.98] transition">
                        Driver arrived
                      </button>
                      <button onClick={() => alert('Calling driver...')} className="px-4 bg-[#1A1C23] border border-zinc-800 text-white rounded-xl hover:bg-zinc-800 transition">
                        <Phone className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );

          case 18: // Driver Arrived - Uber-style
            const arrivedDriver = drivers.find(d => d.id === activeBooking?.driverId) || drivers[0];
            return (
              <div className="flex flex-col justify-between h-full bg-[#0A0B0F] relative overflow-hidden">
                {/* Map showing driver arrived */}
                <div className="absolute inset-0 z-0">
                  <VirtualMap
                    height="100%"
                    zoom={16}
                    pickup={{ lat: -1.2921, lng: 36.8219, label: activeBooking?.pickup }}
                    driverLocation={{ lat: -1.2920, lng: 36.8218, heading: 0 }}
                    hideControls
                  />
                </div>

                {/* Top bar */}
                <div className="relative z-10 p-4 pt-12">
                  <div className="bg-zinc-950/90 border border-zinc-800 px-4 py-2 rounded-full text-[11px] text-white shadow-lg inline-flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="font-medium">Driver has arrived</span>
                  </div>
                </div>

                <div className="my-auto pointer-events-none z-10" />

                {/* Bottom sheet - Arrived */}
                <div className="bg-[#121318] border-t border-zinc-800 rounded-t-[24px] relative z-10 shadow-[0_-8px_30px_rgba(0,0,0,0.5)]">
                  <div className="w-9 h-1 bg-zinc-600 mx-auto rounded-full mt-2.5 mb-1" />

                  <div className="p-4 pt-2 space-y-3">
                    {/* Vehicle info */}
                    <div className="flex items-center gap-3 bg-emerald-500/10 border border-emerald-500/20 p-3.5 rounded-xl">
                      <div className="w-12 h-12 bg-emerald-500/20 rounded-full flex items-center justify-center shrink-0">
                        <CheckCircle className="w-6 h-6 text-emerald-400" />
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-bold text-white">{arrivedDriver?.vehicleType || 'Tesla Model 3'}</p>
                        <p className="text-[11px] text-zinc-400 font-mono">{arrivedDriver?.carPlate || 'TRP-NEST 01'}</p>
                        <p className="text-[10px] text-emerald-400 font-medium mt-0.5">Look for this vehicle</p>
                      </div>
                    </div>

                    {/* PIN display */}
                    <div className="flex items-center justify-between bg-[#1A1C23] border border-zinc-800 p-3 rounded-xl">
                      <div className="flex items-center gap-2">
                        <Lock className="w-4 h-4 text-[#007AFF]" />
                        <span className="text-[11px] text-zinc-400">Trip PIN</span>
                      </div>
                      <span className="text-lg font-black tracking-[0.3em] text-[#007AFF] font-mono">{activeBooking?.otpCode || '5813'}</span>
                    </div>

                    <button
                      onClick={() => {
                        if (activeBooking) {
                          setBookings(prev => prev.map(b => b.id === activeBooking.id ? { ...b, status: 'en_route', isStarted: true } : b));
                        }
                        setPageNumber(19);
                      }}
                      className="w-full bg-[#007AFF] hover:bg-[#007AFF]/90 text-white font-bold py-3.5 rounded-xl text-sm shadow-lg shadow-[#007AFF]/20 active:scale-[0.98] transition"
                    >
                      Start trip
                    </button>
                  </div>
                </div>
              </div>
            );

          case 19: // Trip in Progress - Uber-style tracking
            const tripDriver = drivers.find(d => d.id === activeBooking?.driverId) || drivers[0];
            return (
              <div className="flex flex-col justify-between h-full bg-[#0A0B0F] relative overflow-hidden">
                {/* Full-screen tracking map with route */}
                <div className="absolute inset-0 z-0">
                  <VirtualMap
                    height="100%"
                    zoom={14}
                    pickup={{ lat: -1.2921, lng: 36.8219, label: activeBooking?.pickup }}
                    destination={{ lat: -1.305, lng: 36.85, label: activeBooking?.destination || searchQuery.dropoff }}
                    driverLocation={{ lat: -1.295, lng: 36.83, heading: 135 }}
                    routePath={[
                      { lat: -1.2921, lng: 36.8219 },
                      { lat: -1.293, lng: 36.824 },
                      { lat: -1.294, lng: 36.827 },
                      { lat: -1.295, lng: 36.83 },
                      { lat: -1.298, lng: 36.84 },
                      { lat: -1.302, lng: 36.845 },
                      { lat: -1.305, lng: 36.85 },
                    ]}
                    hideControls
                  />
                </div>

                {/* Top bar - SOS and add stop */}
                <div className="relative z-10 p-4 pt-12 flex justify-between items-start">
                  <button
                    onClick={() => setPageNumber(21)}
                    className="bg-red-950/90 border border-red-500/30 px-3.5 py-2 rounded-full text-[10px] font-bold text-red-300 shadow-lg flex items-center gap-1.5"
                  >
                    <Shield className="w-3.5 h-3.5" />
                    <span>SOS</span>
                  </button>
                  <button
                    onClick={() => setPageNumber(20)}
                    className="bg-zinc-950/90 border border-zinc-800 px-3.5 py-2 rounded-full text-[10px] font-medium text-white shadow-lg flex items-center gap-1.5"
                  >
                    <span>+ Stop</span>
                  </button>
                </div>

                <div className="my-auto pointer-events-none z-10" />

                {/* Bottom sheet - Trip progress */}
                <div className="bg-[#121318] border-t border-zinc-800 rounded-t-[24px] relative z-10 shadow-[0_-8px_30px_rgba(0,0,0,0.5)]">
                  <div className="w-9 h-1 bg-zinc-600 mx-auto rounded-full mt-2.5 mb-1" />

                  <div className="p-4 pt-2 space-y-3">
                    {/* Live ETA */}
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[10px] text-zinc-500 font-medium">Arriving at</p>
                        <p className="text-lg font-bold text-white">{searchQuery.dropoff || 'Destination'}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-black text-[#007AFF]">12</p>
                        <p className="text-[10px] text-zinc-500 -mt-1">min</p>
                      </div>
                    </div>

                    {/* Driver info */}
                    <div className="flex items-center gap-3 bg-[#1A1C23] border border-zinc-800 p-3 rounded-xl">
                      <img
                        src={tripDriver?.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80'}
                        alt={tripDriver?.name}
                        className="w-9 h-9 rounded-full object-cover border border-zinc-700 shrink-0"
                      />
                      <div className="flex-1 text-left min-w-0">
                        <p className="text-sm font-bold text-white">{tripDriver?.name || 'Marcus'}</p>
                        <div className="flex items-center gap-2 text-[10px] text-zinc-400">
                          <span>{tripDriver?.vehicleType || 'Tesla Model 3'}</span>
                          <span className="text-zinc-600">•</span>
                          <span className="text-[#007AFF]">★ {tripDriver?.rating || 4.9}</span>
                        </div>
                      </div>
                      <button onClick={() => setPageNumber(22)} className="p-2 bg-[#007AFF]/10 rounded-lg text-[#007AFF]">
                        <MessageSquare className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Stops */}
                    {stops.length > 0 && (
                      <div className="flex items-center gap-2 text-[11px] text-zinc-500">
                        <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                        <span className="font-medium">{stops.length} stop{stops.length > 1 ? 's' : ''} added</span>
                      </div>
                    )}

                    {/* Bottom actions */}
                    <div className="flex gap-2">
                      <button
                        onClick={() => setPageNumber(23)}
                        className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-black font-bold py-3 rounded-xl text-xs shadow-lg active:scale-[0.98] transition"
                      >
                        Complete trip
                      </button>
                      <button
                        onClick={() => alert('Share link copied!')}
                        className="px-4 bg-[#1A1C23] border border-zinc-800 text-white rounded-xl hover:bg-zinc-800 transition"
                      >
                        <Share2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );

          case 20: // Add Stop/Multiple Stops Page
            return (
              <div className="flex flex-col justify-between h-full bg-[#0E1015] p-5">
                <div className="space-y-4 text-left">
                  <header className="pb-1 border-b border-zinc-850 flex justify-between items-center">
                    <h2 className="text-xs font-black uppercase tracking-wider text-[#007AFF]">Manage Transit Stops</h2>
                    <button onClick={() => setPageNumber(19)} className="p-1 hover:bg-zinc-800 rounded-lg text-zinc-500">
                      <X className="w-4 h-4" />
                    </button>
                  </header>

                  <p className="text-xs text-zinc-400">Inserting additional intermediate coordinates updates route pricing and aligns driver guide GPS paths without delay.</p>
                  
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      placeholder="Add detour spot (e.g. Lavington Mall)" 
                      value={newStopText} 
                      onChange={(e)=>setNewStopText(e.target.value)}
                      className="flex-grow bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white"
                    />
                    <button 
                      onClick={() => {
                        if (!newStopText) return;
                        setStops([...stops, newStopText]);
                        setNewStopText('');
                        alert('Intermediate destination stop queued! Ride price updated by nominal +$2.50.');
                      }}
                      className="bg-primary hover:bg-primary/95 text-white font-bold px-4 rounded-xl text-xs uppercase"
                    >
                      Queue
                    </button>
                  </div>

                  {/* Stops List */}
                  <div className="space-y-1.5 pt-2">
                    <span className="text-[9px] uppercase font-black text-zinc-500 block font-mono">Detour Coordinates Timeline</span>
                    {stops.length === 0 ? (
                      <p className="text-[10px] text-zinc-600 italic">No detour stops inserted yet.</p>
                    ) : (
                      <div className="space-y-1.5">
                        {stops.map((st, i) => (
                          <div key={i} className="p-2.5 bg-zinc-950 border border-zinc-900 rounded-xl flex items-center justify-between text-xs text-white">
                            <span className="truncate max-w-[200px]">{st}</span>
                            <button 
                              onClick={() => {
                                setStops(stops.filter((_, idx) => idx !== i));
                              }}
                              className="text-red-400 hover:text-red-300 font-bold font-mono"
                            >
                              Wipe
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <button 
                  onClick={() => setPageNumber(19)} // Return to in-progress tracker
                  className="w-full bg-[#1A1B22] border border-zinc-805 text-white font-bold py-3 rounded-xl text-xs uppercase"
                >
                  Return to Active Journey
                </button>
              </div>
            );

          case 21: // Emergency/SOS Page
            return (
              <div className="flex flex-col justify-between h-full bg-[#0E1015] p-5">
                <div className="space-y-4">
                  <header className="pb-1 border-b border-zinc-850 flex justify-between items-center text-red-500">
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4 animate-pulse" />
                      <span className="text-xs font-black uppercase tracking-widest">Incident Response Suite</span>
                    </div>
                    <button onClick={() => setPageNumber(19)} className="p-1.5 bg-zinc-900 rounded-full text-zinc-400 hover:text-white">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </header>

                  <div className="bg-red-950/20 border border-red-500/20 p-4 rounded-2xl text-left space-y-2">
                    <h3 className="font-extrabold text-sm text-red-300 leading-none">Instant Incident response Dispatch</h3>
                    <p className="text-[11px] text-red-200/70 leading-relaxed font-sans">
                      Click the button below to instantly trigger an encrypted threat beacon. High-priority vehicle tracking coordinates will transmit to local patrol nodes immediately.
                    </p>
                  </div>

                  {/* Quick Action Targets */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <button 
                      onClick={() => alert('Secure SMS coordinates dispatch executed to Grace Ndungu!')}
                      className="p-3 bg-zinc-90 w-full border border-zinc-850 rounded-xl flex flex-col items-center gap-1 font-bold text-white hover:border-red-500"
                    >
                      <Phone className="w-4 h-4 text-red-400 shrink-0" />
                      <span>Alert Family / Trusted</span>
                    </button>
                    <button 
                      onClick={() => alert('Dialing Police emergency lines anonymously.')}
                      className="p-3 bg-zinc-90 w-full border border-zinc-855 rounded-xl flex flex-col items-center gap-1 font-bold text-white hover:border-red-500 animate-pulse"
                    >
                      <ShieldCheck className="w-4 h-4 text-red-400 shrink-0" />
                      <span>Dial Police Core</span>
                    </button>
                  </div>

                  {/* Trusted Contacts setup */}
                  <div className="bg-zinc-950 p-3 rounded-xl border border-zinc-900 space-y-2 text-left">
                    <span className="text-[8.5px] uppercase font-black text-zinc-500 block">Emergency Contact Links</span>
                    {emergencyContacts.map((contact, i) => (
                      <div key={i} className="flex justify-between items-center text-xs">
                        <span className="text-white font-bold">{contact.name}</span>
                        <span className="text-zinc-500 font-mono font-bold">{contact.phone}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <button 
                  onClick={() => {
                    alert('Dispatched emergency alert to regional monitoring team. Active GPS lock applied.');
                  }}
                  className="w-full bg-red-650 hover:bg-red-700 bg-red-900 text-white font-bold py-3.5 rounded-xl text-xs uppercase"
                >
                  Trigger Panic Threat SOS
                </button>
              </div>
            );

          case 22: // Contact Driver Page (Chat)
            return (
              <div className="flex flex-col justify-between h-full bg-[#0E1015]">
                {/* Chat window Header */}
                <header className="p-4 bg-[#0A0C10] border-b border-zinc-850 flex items-center justify-between">
                  <div className="flex items-center gap-3 text-left">
                    <img 
                      src={drivers[0]?.avatarUrl} 
                      alt="Driver Portrait" 
                      className="w-9 h-9 rounded-full object-cover border border-[#007AFF]" 
                    />
                    <div className="leading-none text-left">
                      <h4 className="font-bold text-xs text-white">{drivers[0]?.name || 'Marcus Vance'}</h4>
                      <span className="text-[9px] text-[#10B981] font-bold uppercase leading-none block mt-1">Chat Connection Active</span>
                    </div>
                  </div>
                  <button onClick={() => setPageNumber(17)} className="p-1 hover:bg-zinc-800 rounded-lg text-zinc-400">
                    <X className="w-4.5 h-4.5" />
                  </button>
                </header>

                {/* Messages Box sandbox */}
                <div className="flex-grow p-4 overflow-y-auto space-y-3 flex flex-col justify-end text-left select-none max-h-[380px]">
                  {chatMessages.map((msg, i) => (
                    <div 
                      key={i}
                      className={`max-w-[70%] p-2.5 rounded-2xl text-xs ${msg.sender === 'rider' ? 'bg-[#007AFF] text-white self-end rounded-br-none' : 'bg-zinc-900 text-zinc-200 self-start rounded-bl-none'}`}
                    >
                      <p className="leading-normal font-sans">{msg.text}</p>
                      <span className="text-[7.5px] text-zinc-400 font-bold block mt-1 text-right">{msg.time}</span>
                    </div>
                  ))}
                </div>

                {/* Input action */}
                <div className="p-3 bg-[#0A0C10] border-t border-zinc-850 flex gap-2">
                  <input 
                    type="text" 
                    value={chatInput}
                    onChange={(e)=>setChatInput(e.target.value)}
                    placeholder="Type encrypted message..."
                    className="flex-grow bg-zinc-900 border border-zinc-800 rounded-xl px-3 text-xs text-white focus:outline-none"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && chatInput) {
                        setChatMessages([...chatMessages, { sender: 'rider', text: chatInput, time: '14:04' }]);
                        setChatInput('');
                      }
                    }}
                  />
                  <button 
                    onClick={() => {
                      if (!chatInput) return;
                      setChatMessages([...chatMessages, { sender: 'rider', text: chatInput, time: '14:04' }]);
                      setChatInput('');
                    }}
                    className="bg-primary text-white p-2.5 rounded-xl hover:scale-105 active:scale-95 transition-all text-xs font-bold"
                  >
                    Send
                  </button>
                </div>
              </div>
            );

          // ================= POST-RIDE FLOW =================
          case 23: // Trip Completed - with payment processing
            const completedDriver = drivers.find(d => d.id === activeBooking?.driverId) || drivers[0];
            const displayFare = activeBooking?.fare?.amount || activeBooking?.originalPrice || 0;
            React.useEffect(() => {
              if (activeBooking && activeBooking.paymentStatus === 'unpaid') {
                processPayment(activeBooking);
              }
            }, []);
            return (
              <div className="flex flex-col justify-between h-full bg-[#0A0B0F] relative overflow-hidden">
                <div className="absolute inset-0 z-0 opacity-60">
                  <VirtualMap height="100%" zoom={13} destination={{ lat: -1.305, lng: 36.85 }} hideControls />
                </div>

                <div className="relative z-10 flex flex-col justify-between h-full p-5" style={{ background: 'linear-gradient(to top, rgba(10,11,15,1) 40%, rgba(10,11,15,0.6) 70%, transparent)' }}>
                  <div className="text-center mt-8">
                    <div className="w-14 h-14 bg-emerald-500/20 border-2 border-emerald-400 rounded-full flex items-center justify-center mx-auto mb-3">
                      <CheckCircle className="w-7 h-7 text-emerald-400" />
                    </div>
                    <h2 className="text-lg font-bold text-white">Trip completed</h2>
                    <p className="text-[11px] text-zinc-400 mt-1">{searchQuery.dropoff || 'Destination'}</p>
                  </div>

                  <div className="bg-[#121318] border border-zinc-800 rounded-2xl p-4 space-y-3">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <img src={completedDriver?.avatarUrl || ''} alt="driver" className="w-8 h-8 rounded-full object-cover" />
                        <span className="text-sm font-bold text-white">{completedDriver?.name || 'Marcus'}</span>
                      </div>
                      <span className="text-lg font-black text-white">KES {displayFare}</span>
                    </div>

                    {isProcessingPayment && (
                      <div className="flex items-center gap-2 text-[11px] text-zinc-400 bg-zinc-950 rounded-lg p-2">
                        <div className="w-4 h-4 border-2 border-[#007AFF] border-t-transparent rounded-full animate-spin" />
                        <span>Processing payment...</span>
                      </div>
                    )}

                    {paymentStatusMsg && (
                      <div className={`text-[10px] p-2 rounded-lg ${paymentStatusMsg.includes('sent') || paymentStatusMsg.includes('success') || paymentStatusMsg.includes('noted') ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                        {paymentStatusMsg}
                      </div>
                    )}

                    {activeBooking?.paymentMethod === 'mpesa' && !isProcessingPayment && !paymentStatusMsg && (
                      <button
                        onClick={() => processPayment(activeBooking)}
                        className="w-full bg-[#007AFF] hover:bg-[#007AFF]/90 text-white font-semibold py-2.5 rounded-xl text-xs transition"
                      >
                        Pay with M-Pesa
                      </button>
                    )}

                    <div className="flex gap-2">
                      <button onClick={() => setPageNumber(24)} className="flex-1 bg-[#007AFF] hover:bg-[#007AFF]/90 text-white font-bold py-3 rounded-xl text-xs active:scale-[0.98] transition">
                        {activeBooking?.paymentStatus === 'paid' ? 'Rate driver' : 'Skip payment'}
                      </button>
                      <button onClick={() => setPageNumber(8)} className="flex-1 bg-[#1A1C23] border border-zinc-800 text-white font-medium py-3 rounded-xl text-xs hover:bg-zinc-800 transition">
                        Home
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );

          case 24: // Rate & Review Driver Page
            return (
              <div className="flex flex-col justify-between h-full bg-[#0E1015] p-5">
                <div className="space-y-4 text-center">
                  <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-[#007AFF] mx-auto mt-4">
                    <img 
                      src={drivers[0]?.avatarUrl} 
                      alt="Driver Portrait" 
                      className="w-full h-full object-cover" 
                    />
                  </div>
                  
                  <div className="space-y-1">
                    <h3 className="font-bold text-xs text-zinc-400 font-sans uppercase">GUIDE RATING SELECTOR</h3>
                    <h2 className="text-base font-black text-white">Rate your tripnest guide {drivers[0]?.name || 'Marcus'}</h2>
                  </div>

                  {/* Rating Stars */}
                  <div className="flex justify-center gap-2 py-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button 
                        key={star} 
                        onClick={() => setRatingStars(star)}
                        className="p-1 hover:scale-115 active:scale-90 transition-all outline-none"
                      >
                        <Star className={`w-8 h-8 ${star <= ratingStars ? 'text-[#007AFF] fill-[#007AFF]' : 'text-zinc-700'}`} />
                      </button>
                    ))}
                  </div>

                  {/* Comment inputs */}
                  <textarea 
                    value={reviewText}
                    onChange={(e)=>setReviewText(e.target.value)}
                    placeholder="Enter written feedback about custom coordinates route and vehicle conditions (optional)..."
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-3 text-xs text-white focus:outline-none focus:border-primary shrink-0 text-left"
                    rows={3}
                  />
                </div>

                <div className="space-y-2.5">
                  <button 
                    onClick={() => {
                      alert('Star feedback submitted!');
                      setPageNumber(25); // Go to Tip Screen
                    }}
                    className="w-full bg-primary hover:bg-primary/95 text-white font-bold py-3.5 rounded-xl text-xs uppercase"
                  >
                    Proceed to Tip Guide
                  </button>
                </div>
              </div>
            );

          case 25: // Add Tip Page
            const baseFareNum = bookingCategory === 'Premium' ? 45 : bookingCategory === 'XL' ? 25 : 15;
            const computedPercentage = Math.round(baseFareNum * tipPercent / 100);
            const totalWithTippingVal = baseFareNum + computedPercentage;
            return (
              <div className="flex flex-col justify-between h-full bg-[#0E1015] p-5 text-center">
                <div className="space-y-4 my-auto">
                  <div className="p-3 bg-[#007AFF]/10 border border-primary/20 text-primary rounded-3xl w-fit mx-auto">
                    <DollarSign className="w-8 h-8 shrink-0" />
                  </div>
                  
                  <div className="space-y-1">
                    <h2 className="text-base font-black text-white">Express Gratitude with Tip?</h2>
                    <p className="text-xs text-zinc-400">100% of driver guide tips go directly to transit guides for maintaining carbon neutral offsets.</p>
                  </div>

                  {/* Percentage selector */}
                  <div className="grid grid-cols-3 gap-2 py-3">
                    {[15, 20, 25].map((pct) => (
                      <button 
                        key={pct}
                        onClick={() => {
                          setTipPercent(pct);
                          setCustomTip('');
                        }}
                        className={`py-3.5 rounded-xl border text-xs font-black uppercase transition-all ${tipPercent === pct && !customTip ? 'bg-primary/10 border-primary text-[#007AFF]' : 'bg-zinc-900 border-zinc-850 text-zinc-400 hover:border-zinc-700'}`}
                      >
                        {pct}% (+${Math.round(baseFareNum * pct / 100)})
                      </button>
                    ))}
                  </div>

                  <input 
                    type="number"
                    placeholder="Custom tip amount (USD)"
                    value={customTip}
                    onChange={(e) => {
                      setCustomTip(e.target.value);
                      setTipPercent(0);
                    }}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2.5 text-xs text-white font-mono"
                  />
                </div>

                <div className="space-y-2">
                  <button 
                    onClick={() => {
                      alert('Tip settings initialized! Finalizing detailed invoice.');
                      setPageNumber(26); // Go to receipt invoice details
                    }}
                    className="w-full bg-primary hover:bg-primary/95 text-white font-black py-3.5 rounded-xl text-xs uppercase"
                  >
                    Authenticate Invoice Receipt
                  </button>
                </div>
              </div>
            );

          case 26: // Receipt/Invoice Page
            const matchedPercentageValue = tipPercent > 0 ? Math.round(45 * tipPercent / 100) : Number(customTip) || 0;
            return (
              <div className="flex flex-col h-full bg-[#0E1015] p-5 justify-between">
                <div className="space-y-4">
                  <header className="pb-1 border-b border-zinc-850 text-left">
                    <h2 className="text-xs font-black uppercase tracking-wider text-[#007AFF]">Detailed Tax Invoice</h2>
                    <span className="text-[8px] font-mono text-zinc-500 font-bold">INV-982-1134</span>
                  </header>

                  <div className="p-4 bg-zinc-950 border border-zinc-900 rounded-2xl text-xs space-y-2 text-left text-zinc-400">
                    <div className="flex justify-between border-b border-zinc-900 pb-1.5 mb-1 text-white font-bold">
                      <span>Core Service Tier</span>
                      <span className="uppercase text-[#007AFF]">Premium Black Shuttle</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Base Flag Fare Rate</span>
                      <span className="font-mono text-white">$35.00</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Distance &amp; Time charge</span>
                      <span className="font-mono text-white">$10.00</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Green Fuel levy</span>
                      <span className="font-mono text-white">$2.50</span>
                    </div>
                    <div className="flex justify-between text-[#007AFF]">
                      <span>Guide Reward Tip</span>
                      <span className="font-mono">+${matchedPercentageValue.toFixed(2)}</span>
                    </div>
                    <hr className="border-zinc-900 my-1" />
                    <div className="flex justify-between font-black text-sm text-white pt-1">
                      <span>Paid with Visa •••• 5678</span>
                      <span className="font-mono text-emerald-400">${(47.50 + matchedPercentageValue).toFixed(2)}</span>
                    </div>
                  </div>

                  <button 
                    onClick={() => alert('Encrypted PDF copy dispatched to alex.morgan@tripnest.com!')}
                    className="w-full bg-[#1C1D24] text-white border border-zinc-800 text-xs uppercase py-2.5 font-bold rounded-xl active:scale-95 transition-all text-center flex items-center justify-center gap-1.5"
                  >
                    <FileText className="w-4 h-4 text-zinc-400" />
                    <span>Email Invoice PDF</span>
                  </button>
                </div>

                <button 
                  onClick={() => setPageNumber(27)} // View completed history log
                  className="w-full bg-primary hover:bg-primary/95 text-white font-black py-3.5 rounded-xl text-xs uppercase"
                >
                  Inspect Journey History
                </button>
              </div>
            );

          case 27: // Trip History Page
            return (
              <div className="flex flex-col justify-between h-full bg-[#0E1015] p-5">
                <div className="space-y-4">
                  <header className="pb-1 border-b border-zinc-850 text-left">
                    <h2 className="text-xs font-black uppercase tracking-wider text-white">Dispatched Transit Logs</h2>
                  </header>

                  <div className="space-y-2 overflow-y-auto max-h-[360px] pr-1">
                    {[
                      { id: '1', dest: 'Alchemist Bar Westlands', date: 'June 01, 2026', price: '$45.00', status: 'Completed', color: 'text-emerald-400' },
                      { id: '2', dest: 'Jomo Kenyatta (JKIA) Terminal 1', date: 'May 28, 2026', price: '$22.00', status: 'Completed', color: 'text-emerald-400' },
                      { id: '3', dest: 'Coastal Kilifi Beach Arena', date: 'May 14, 2026', price: '$15.00', status: 'Cancelled', color: 'text-red-400' }
                    ].map((item) => (
                      <div 
                        key={item.id} 
                        onClick={() => setPageNumber(28)} // Open detailed retrospective trip
                        className="p-3 bg-[#13141A] border border-zinc-850 rounded-xl hover:border-primary/40 cursor-pointer text-left transition"
                      >
                        <div className="flex justify-between items-center pb-1">
                          <span className="font-bold text-xs text-white truncate max-w-[170px]">{item.dest}</span>
                          <span className="font-mono font-black text-xs text-white">{item.price}</span>
                        </div>
                        <div className="flex justify-between text-[10px] text-zinc-500 font-medium">
                          <span>{item.date}</span>
                          <span className={`font-bold ${item.color}`}>{item.status}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <button onClick={() => setPageNumber(8)} className="w-full bg-zinc-900 border border-zinc-805 py-3 rounded-xl text-xs uppercase font-bold text-center">
                  Return to Main Map
                </button>
              </div>
            );

          case 28: // Trip Details Page (Individual Retrospective View)
            return (
              <div className="flex flex-col h-full bg-[#0E1015] p-5 justify-between">
                <div className="space-y-4 text-left">
                  <header className="pb-1 border-b border-zinc-850 flex justify-between items-center">
                    <span className="text-[9px] font-mono font-extrabold bg-[#007AFF]/15 text-primary px-2 py-0.5 rounded uppercase">LOG ID: TRP-88219</span>
                    <button onClick={() => setPageNumber(27)} className="p-1 hover:bg-zinc-800 rounded-lg text-zinc-500">
                      <X className="w-4 h-4" />
                    </button>
                  </header>

                  <div className="p-3 bg-zinc-950 border border-zinc-900 rounded-2xl space-y-2">
                    <span className="text-[8.5px] uppercase font-black text-primary block tracking-wider">RETROSPECTIVE ANALYSIS</span>
                    <div className="text-xs space-y-1 text-zinc-400">
                      <p><strong>Geographic Region:</strong> Nairobi Metropolitan</p>
                      <p><strong>Matched Driver Guide:</strong> {drivers[0]?.name || 'Marcus Vance'}</p>
                      <p><strong>Vehicle Model:</strong> Tesla Model S Series</p>
                      <p><strong>Carbon Emission Reduction:</strong> 15 lbs CO₂</p>
                      <p><strong>Payment Settlement:</strong> Visa Credit Card (•••• 5678)</p>
                    </div>
                  </div>

                  {/* Customer issue button */}
                  <button 
                    onClick={() => alert('Support ticket launched. Our Live Operations concierge team will sync with your account details shortly.')}
                    className="w-full bg-red-950/20 hover:bg-red-950 border border-red-500/30 text-red-300 py-2.5 rounded-xl text-xs font-bold transition-all uppercase text-center"
                  >
                    Report Transit Issue
                  </button>
                </div>

                <div className="space-y-2">
                  <button onClick={() => setPageNumber(8)} className="w-full bg-primary hover:bg-primary/95 text-white font-black py-3.5 rounded-xl text-xs uppercase">
                    Return to home
                  </button>
                </div>
              </div>
            );

          // ================= ACCOUNT & SETTINGS =================
          case 29: // Profile Page
            return (
              <div className="flex flex-col justify-between h-full bg-[#0E1015] p-5 text-center">
                <div className="space-y-4">
                  <header className="pb-1 border-b border-zinc-850 text-left">
                    <h2 className="text-xs font-black uppercase tracking-wider text-white">Your Profile parameters</h2>
                  </header>

                  <div className="flex flex-col items-center gap-2 py-2">
                    <img src={passenger.avatarUrl} alt="Avatar" className="w-16 h-16 rounded-full border-2 border-primary object-cover" />
                    <h3 className="font-bold text-sm text-white">{passenger.name}</h3>
                    <p className="text-[10px] text-zinc-500 leading-none">Active member rating: ★ 4.95 verified client</p>
                  </div>

                  <div className="space-y-2 text-left">
                    <div className="bg-zinc-950 border border-zinc-900 rounded-xl p-3 text-xs text-white flex justify-between justify-items-center">
                      <span className="text-zinc-500 font-bold font-sans">Verified Email</span>
                      <span>{passenger.email}</span>
                    </div>
                    <div className="bg-zinc-950 border border-zinc-900 rounded-xl p-3 text-xs text-white flex justify-between justify-items-center">
                      <span className="text-zinc-500 font-bold font-sans">Verified Phone</span>
                      <span>{passenger.phone}</span>
                    </div>
                    <div className="bg-zinc-950 border border-zinc-900 rounded-xl p-3 text-xs text-white flex justify-between justify-items-center">
                      <span className="text-zinc-500 font-bold font-sans">Trips Completed</span>
                      <span className="font-mono font-bold text-primary">{passenger.tripsCount || 124} rides</span>
                    </div>
                  </div>
                </div>

                <button onClick={() => setPageNumber(8)} className="w-full bg-zinc-900 border border-zinc-805 py-3 rounded-xl text-xs font-bold uppercase tracking-wide">
                  Return to map
                </button>
              </div>
            );

          case 30: // Wallet & Payment Accounts with transaction history
            React.useEffect(() => { loadTransactions(); }, []);
            return (
              <div className="flex flex-col justify-between h-full bg-[#0E1015] p-5 text-left">
                <div className="space-y-4 flex-grow overflow-hidden flex flex-col">
                  <header className="pb-2 border-b border-zinc-850 shrink-0">
                    <h2 className="text-xs font-black uppercase tracking-wider text-white font-sans">Wallet &amp; Payment History</h2>
                  </header>

                  {/* Saved payment methods */}
                  <div className="space-y-1.5 shrink-0">
                    <span className="text-[8px] font-black uppercase text-zinc-500 tracking-wider block font-mono">Saved Payment Methods</span>
                    {paymentMethods.map((pm) => (
                      <div key={pm.id} className="p-2.5 bg-zinc-950 border border-zinc-900 rounded-xl flex items-center justify-between text-[11px]">
                        <div className="flex items-center gap-2.5">
                          {pm.type === 'card' ? (
                            <CreditCard className="w-4 h-4 text-[#007AFF]" />
                          ) : (
                            <Smartphone className="w-4 h-4 text-emerald-400" />
                          )}
                          <div>
                            <span className="font-bold text-white block">{pm.label}</span>
                            <span className="text-[9px] text-zinc-500 block">{pm.details}</span>
                          </div>
                        </div>
                        {pm.isDefault && <span className="bg-[#007AFF]/10 text-[#007AFF] text-[7px] font-black px-1.5 py-0.5 rounded">Default</span>}
                      </div>
                    ))}
                  </div>

                  {/* Transactions */}
                  <div className="flex-1 overflow-y-auto min-h-0 space-y-1.5 pr-1">
                    <span className="text-[8px] font-black uppercase text-zinc-500 tracking-wider block font-mono sticky top-0 bg-[#0E1015] py-1">Transaction History</span>
                    {transactions.length === 0 ? (
                      <div className="text-center py-6">
                        <div className="w-10 h-10 bg-zinc-900 rounded-full flex items-center justify-center mx-auto mb-2">
                          <CreditCard className="w-5 h-5 text-zinc-600" />
                        </div>
                        <p className="text-[10px] text-zinc-600">No transactions yet</p>
                        <button onClick={loadTransactions} className="text-[#007AFF] text-[10px] font-medium mt-1">Refresh</button>
                      </div>
                    ) : (
                      transactions.map((txn: Transaction) => (
                        <div key={txn.id} className="p-2.5 bg-zinc-950 border border-zinc-900 rounded-xl flex items-center justify-between text-[11px]">
                          <div className="flex items-center gap-2.5 min-w-0 flex-1">
                            <div className={`p-1.5 rounded-lg shrink-0 ${
                              txn.method === 'mpesa' ? 'bg-emerald-900/20' : 'bg-zinc-800'
                            }`}>
                              {txn.method === 'mpesa' ? (
                                <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
                              ) : (
                                <CreditCard className="w-3.5 h-3.5 text-[#007AFF]" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <span className="font-bold text-white block truncate">
                                {txn.method === 'mpesa' ? 'M-Pesa' : 'Card'} • {txn.mpesaReceiptCode || txn.stripePaymentIntentId?.slice(-8) || ''}
                              </span>
                              <span className="text-[9px] text-zinc-500 block">{new Date(txn.createdAt).toLocaleDateString()}</span>
                            </div>
                          </div>
                          <div className="text-right shrink-0 ml-2">
                            <span className={`font-bold text-[12px] block ${txn.status === 'completed' ? 'text-emerald-400' : txn.status === 'failed' ? 'text-red-400' : 'text-zinc-400'}`}>
                              {txn.currency === 'KES' ? 'KSh' : '$'}{txn.amount}
                            </span>
                            <span className={`text-[8px] uppercase font-black ${
                              txn.status === 'completed' ? 'text-emerald-500' : txn.status === 'failed' ? 'text-red-400' : 'text-zinc-500'
                            }`}>{txn.status}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <button onClick={() => setPageNumber(8)} className="w-full bg-[#1A1B22] border border-zinc-800 py-3 rounded-xl text-xs font-bold text-center mt-3">
                  Close
                </button>
              </div>
            );

          case 31: // Settings Page
            return (
              <div className="flex flex-col justify-between h-full bg-[#0E1015] p-5 text-left">
                <div className="space-y-4">
                  <header className="pb-2 border-b border-zinc-850">
                    <h2 className="text-xs font-black uppercase tracking-wider text-white">General Application Settings</h2>
                  </header>

                  <div className="space-y-2">
                    {[
                      { title: 'Metric Distance Units', desc: 'Display ETA coordinates and distances in Miles (standard).' },
                      { title: 'Autoplay High-fidelity Maps', desc: 'Allows live 3D web isometric elements to scale.' },
                      { title: 'Share Carbon Offsets Analytics', desc: 'Renders cumulative offset data on public certificates.' }
                    ].map((st, idx) => (
                      <div key={idx} className="p-3 bg-zinc-90 bg-zinc-950 border border-zinc-900 rounded-xl flex justify-between items-center text-xs">
                        <div className="leading-none text-left flex-grow max-w-[200px] space-y-1">
                          <span className="font-bold text-white block">{st.title}</span>
                          <span className="text-[9.5px] text-zinc-500 block leading-normal">{st.desc}</span>
                        </div>
                        <div className="w-10 h-6 bg-primary/20 border border-primary rounded-full relative p-0.5 flex items-center justify-end cursor-pointer">
                          <div className="w-4 h-4 bg-primary rounded-full shadow-[0_0_8px_#007AFF]" />
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="pt-2 space-y-2">
                    <button 
                      onClick={async () => {
                        if (confirm('Are you sure you want to log out and secure your transit session token?')) {
                          try {
                            await auth.signOut();
                          } catch (err) {
                            console.error('Firebase Auth sign out error:', err);
                          }
                          setPassenger({ ...passenger, isRegistered: false });
                          setPageNumber(1);
                        }
                      }}
                      className="w-full bg-red-950/20 hover:bg-red-950/40 border border-red-500/30 text-red-400 py-2.5 rounded-xl text-xs uppercase font-bold text-center flex items-center justify-center gap-2 transition cursor-pointer"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Secure Sign Out</span>
                    </button>
                    <button
                      onClick={() => setPageNumber(50)}
                      className="w-full bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 py-2.5 rounded-xl text-[9px] uppercase font-bold text-center transition"
                    >
                      Admin: Pricing Panel
                    </button>
                  </div>
                </div>

                <button onClick={() => setPageNumber(8)} className="w-full bg-[#1A1B22] border border-zinc-805 py-3 rounded-xl text-xs uppercase font-bold text-center">
                  Save preferences
                </button>
              </div>
            );

          case 32: // Safety Settings Page
            return (
              <div className="flex flex-col justify-between h-full bg-[#0E1015] p-5 text-left">
                <div className="space-y-4">
                  <header className="pb-1 border-b border-zinc-850">
                    <h2 className="text-xs font-black uppercase tracking-wider text-white">Tripnest Safety Settings</h2>
                  </header>

                  <div className="space-y-2.5 pt-2">
                    {/* Item 1 */}
                    <div className="p-3 bg-zinc-950 border border-zinc-900 rounded-xl space-y-1">
                      <span className="font-bold text-xs text-white block">Auto Trip Logs Share</span>
                      <p className="text-[10px] text-zinc-500 leading-normal">Automatically transmit real-time location coordinate links to trusted emergency contacts upon ride departure nodes.</p>
                    </div>

                    {/* Contact adder */}
                    <div className="bg-[#18191E] border border-zinc-850 p-3 rounded-2xl space-y-2">
                      <span className="text-[9px] uppercase font-black text-primary block tracking-wider">Configure Trusted contact</span>
                      <div className="flex gap-2">
                        <input 
                          type="text" 
                          placeholder="Grace" 
                          value={newContact.name}
                          onChange={(e)=>setNewContact({...newContact, name: e.target.value})}
                          className="w-1/2 bg-zinc-900 border border-zinc-800 text-xs text-white px-2 py-1 rounded" 
                        />
                        <input 
                          type="text" 
                          placeholder="+254..." 
                          value={newContact.phone}
                          onChange={(e)=>setNewContact({...newContact, phone: e.target.value})}
                          className="w-1/2 bg-zinc-900 border border-zinc-800 text-xs text-white px-2 py-1 rounded" 
                        />
                      </div>
                      <button 
                        onClick={() => {
                          if (!newContact.name || !newContact.phone) return;
                          setEmergencyContacts([...emergencyContacts, { name: newContact.name, phone: newContact.phone }]);
                          setNewContact({ name: '', phone: '' });
                          alert('Trusted emergency contact updated in safety shield db.');
                        }}
                        className="w-full bg-primary/20 hover:bg-primary text-primary hover:text-white py-1 rounded text-[10px] font-bold uppercase transition"
                      >
                        Enroll Contact
                      </button>
                    </div>
                  </div>
                </div>

                <button onClick={() => setPageNumber(8)} className="w-full bg-zinc-900 border border-zinc-805 py-3 rounded-xl text-xs uppercase font-bold text-center">
                  Save Safety preferences
                </button>
              </div>
            );

          case 33: // Notifications Settings Page
            return (
              <div className="flex flex-col justify-between h-full bg-[#0E1015] p-5 text-left">
                <div className="space-y-4">
                  <header className="pb-1 border-b border-zinc-850">
                    <h2 className="text-xs font-black uppercase tracking-wider text-white">Alerts &amp; Push Notifications</h2>
                  </header>

                  <div className="space-y-2.5 pt-2">
                    {[
                      { title: 'SMS Dispatch Alerts', desc: 'Prompt coordinates and driver arrival via cellular network.' },
                      { title: 'Campaign & Promotions Email', desc: 'Receive Tripnest reward certificates and coastal events discounts.' },
                      { title: 'Threat Alarm Push', desc: 'Secure security monitor calls and sound audible alarm on danger.' }
                    ].map((st, idx) => (
                      <div key={idx} className="p-3 bg-zinc-950 border border-[#1A1E26] rounded-xl flex items-center justify-between text-xs">
                        <div className="leading-none text-left flex-grow max-w-[200px] space-y-1">
                          <span className="font-bold text-white block">{st.title}</span>
                          <span className="text-[10px] text-zinc-500 leading-normal block">{st.desc}</span>
                        </div>
                        <div className="w-10 h-6 bg-primary/20 border border-primary rounded-full relative p-0.5 flex items-center justify-end cursor-pointer">
                          <div className="w-4 h-4 bg-primary rounded-full shadow-[0_0_8px_#007AFF]" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <button onClick={() => setPageNumber(8)} className="w-full bg-zinc-900 border border-zinc-805 py-3 rounded-xl text-xs uppercase font-bold text-center">
                  Sync Notification settings
                </button>
              </div>
            );

          case 34: // Privacy & Security Page
            return (
              <div className="flex flex-col justify-between h-full bg-[#0E1015] p-5 text-left">
                <div className="space-y-4">
                  <header className="pb-1 border-b border-zinc-850">
                    <h2 className="text-xs font-black uppercase tracking-wider text-[#007AFF]">System Privacy &amp; Keys</h2>
                  </header>

                  <div className="space-y-3 pt-2 text-xs">
                    <div className="p-3.5 bg-zinc-950 border border-zinc-900 rounded-xl flex items-center justify-between">
                      <div className="leading-none">
                        <span className="font-bold text-white block">Biometric Face Authentication</span>
                        <span className="text-[9.5px] text-zinc-500 mt-1 block">Unlock verification codes seamlessly.</span>
                      </div>
                      <div className="w-10 h-6 bg-primary/20 border border-primary rounded-full relative p-0.5 flex items-center justify-end">
                        <div className="w-4 h-4 bg-primary rounded-full shadow-[0_0_8px_#007AFF]" />
                      </div>
                    </div>

                    <button 
                      onClick={() => {
                        const pass = prompt("Enter old password:");
                        if (pass) alert("Passcode updated inside cryptography database module.");
                      }}
                      className="w-full bg-zinc-900 border border-zinc-800 text-white font-bold p-2.5 rounded-xl uppercase text-[10px] tracking-wide"
                    >
                      Cycle Encryption Passcode
                    </button>
                  </div>
                </div>

                <button onClick={() => setPageNumber(8)} className="w-full bg-zinc-900 border border-zinc-805 py-3 rounded-xl text-xs uppercase font-bold text-center">
                  Save Security preferences
                </button>
              </div>
            );

          // ================= ADDITIONAL COMMON PAGES =================
          case 35: // Help / Support (Searchable FAQ)
            return (
              <div className="flex flex-col justify-between h-full bg-[#0E1015] p-5">
                <div className="space-y-4 text-left">
                  <header className="pb-1 border-b border-[#1A1F2B]">
                    <h2 className="text-xs font-black uppercase tracking-wider text-white">Concierge VIP Help Hub</h2>
                  </header>

                  <input 
                    type="text" 
                    placeholder="Search FAQ topics (e.g. Refunds, Ferry bottlenecks)..."
                    className="w-full bg-zinc-950 border border-zinc-900 rounded-xl px-3 py-2.5 text-xs text-white"
                  />

                  <div className="space-y-2 overflow-y-auto max-h-[220px]">
                    {[
                      { q: 'How is route pricing computed with Kilifi ferry bottlenecks?', a: 'Tripnest tracks marine timetables. detours are applied automatically ahead of transit departures.' },
                      { q: 'Can I request cash payment for coastal music events?', a: 'Yes! Safaricom M-Pesa mobile wallets are preferred to optimize cashless transit security.' }
                    ].map((faq, i) => (
                      <div key={i} className="p-3 bg-zinc-950 border border-zinc-900 rounded-xl space-y-1">
                        <span className="font-bold text-xs text-white block leading-tight">{faq.q}</span>
                        <p className="text-[10px] text-zinc-500 leading-relaxed font-sans">{faq.a}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <button 
                  onClick={() => alert('Support concierge is now calling alex.morgan@tripnest.com.')}
                  className="w-full bg-primary hover:bg-primary/95 text-white font-black py-3 rounded-xl text-xs uppercase"
                >
                  Dial VIP Support Representative
                </button>
              </div>
            );

          case 36: // Promotions/Offers Page
            return (
              <div className="flex flex-col justify-between h-full bg-[#0E1015] p-5">
                <div className="space-y-4 text-left">
                  <header className="pb-1 border-b border-zinc-850">
                    <h2 className="text-xs font-black uppercase tracking-wider text-white">Reward Campaigns</h2>
                  </header>

                  <div className="space-y-2.5 pt-2">
                    {[
                      { title: 'Free Electric upgrade', desc: 'Valid for high-priority bookings this weekend. Reduced travel emissions.' },
                      { title: 'Coast-Resort loyalty cash', desc: 'Complete 3 beach transits in Kilifi/Diani and receive a $10 coupon voucher.' }
                    ].map((promo, idx) => (
                      <div key={idx} className="p-3 bg-zinc-950 border border-zinc-900 rounded-xl text-xs text-left space-y-1">
                        <span className="font-bold text-white block">{promo.title}</span>
                        <p className="text-[10px] text-zinc-500 leading-normal">{promo.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <button onClick={() => setPageNumber(8)} className="w-full bg-zinc-900 border border-zinc-805 py-3 rounded-xl text-xs uppercase font-bold text-center">
                  Close and return
                </button>
              </div>
            );

          case 37: // TRIP HOST Subscription Page (Exquisite Replacements)
            return (
              <div className="flex flex-col justify-between h-full bg-gradient-to-b from-[#11131C] to-[#0A0C12] p-5 text-center">
                <div className="space-y-4 my-auto">
                  <div className="w-16 h-16 rounded-full bg-primary/10 border-2 border-[#007AFF] flex items-center justify-center text-primary mx-auto animate-bounce">
                    <Award className="w-8 h-8" />
                  </div>
                  
                  <div className="space-y-1.5 px-2">
                    <span className="text-[10px] font-mono font-black text-primary tracking-widest uppercase block animate-pulse">TRIP HOST MEMEBERSHIP STATUS</span>
                    <h2 className="text-base font-black text-white leading-tight">Zero Commissions. Ultimate Luxury Event Transit.</h2>
                    <p className="text-[10px] text-zinc-400 leading-relaxed font-sans max-w-xs mx-auto">
                      Upgrade to <strong className="text-white">Trip Host Pass</strong> and unlock $14.99/mo premium privileges across maritime and metropolitan zones.
                    </p>
                  </div>

                  {/* Elite benefits list */}
                  <div className="bg-[#151722]/80 border border-zinc-850 p-3.5 rounded-2xl text-left space-y-2 text-[10.5px]">
                    <div className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-primary shrink-0" />
                      <span className="text-zinc-300">Free, instant lane priority matching on busy events and festivals.</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-primary shrink-0" />
                      <span className="text-zinc-300">Complimentary automatic high-end Electric/Tesla upgrades.</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-primary shrink-0" />
                      <span className="text-zinc-300">Zero service, flag-fall, or booking processing fees.</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <button 
                    onClick={() => {
                      setIsHostSubscribed(!isHostSubscribed);
                      alert(isHostSubscribed ? 'Trip Host Pass cancelled.' : 'Welcome to the inner circle! Your account is now a certified Trip Host member.');
                    }}
                    className={`w-full font-black py-3.5 rounded-xl text-xs uppercase transition-all duration-300 shadow-md ${isHostSubscribed ? 'bg-zinc-850 hover:bg-zinc-800 text-[#FE6565] border border-zinc-800' : 'bg-[#007AFF] hover:bg-primary/95 text-white shadow-primary/15'}`}
                  >
                    {isHostSubscribed ? 'Manage / cancel Trip Host Pass' : 'Activate Trip Host Pass • $14.99/mo'}
                  </button>
                  <button onClick={() => setPageNumber(8)} className="w-full text-zinc-500 hover:text-white py-1 text-[10px] font-black uppercase text-center font-mono">
                    Close Benefits Panel
                  </button>
                </div>
              </div>
            );

          case 38: // Activity/Dashboard (Analytics Spending details)
            return (
              <div className="flex flex-col justify-between h-full bg-[#0E1015] p-5 text-left">
                <div className="space-y-4">
                  <header className="pb-1 border-b border-[#1E222D]">
                    <h2 className="text-xs font-black uppercase tracking-wider text-white">Carbon &amp; Transit Analytics</h2>
                  </header>

                  <div className="grid grid-cols-2 gap-2 text-xs text-center py-2">
                    <div className="p-3 bg-zinc-950 border border-zinc-900 rounded-xl relative">
                      <span className="text-[8.5px] uppercase font-black text-zinc-500 block leading-none font-mono">Total Spent</span>
                      <span className="text-primary font-black font-mono text-sm block mt-1.5">$542.50</span>
                    </div>
                    <div className="p-3 bg-zinc-950 border border-zinc-900 rounded-xl relative">
                      <span className="text-[8.5px] uppercase font-black text-emerald-400 block leading-none font-mono">Carbon offsetted</span>
                      <span className="text-emerald-400 font-bold text-sm block mt-1.5">342 lbs CO₂</span>
                    </div>
                  </div>

                  <div className="p-3 bg-[#11131C] border border-primary/10 rounded-2xl text-xs relative space-y-1">
                    <span className="text-[8px] font-black uppercase text-primary block">Verified Carbon reduction Certificates</span>
                    <p className="text-[10px] text-zinc-400 leading-normal">Your sustainable travel habits in Nairobi Metropolitan loops offset equivalent to planting <strong>5,4 trees</strong> this quarter.</p>
                  </div>
                </div>

                <button onClick={() => setPageNumber(8)} className="w-full bg-[#1A1B22] border border-zinc-805 py-3 rounded-xl text-xs uppercase font-bold text-center">
                  Verify analytic report
                </button>
              </div>
            );

          case 39: // Referral Page
            return (
              <div className="flex flex-col justify-between h-full bg-[#0E1015] p-5 text-center">
                <div className="space-y-4 my-auto">
                  <div className="p-3 bg-primary/10 border border-primary/20 rounded-3xl w-fit mx-auto text-primary">
                    <Gift className="w-8 h-8 shrink-0 animate-bounce" />
                  </div>
                  
                  <div className="space-y-1.5 px-3">
                    <h2 className="text-base font-black text-white">Give $10, Receive $10 Credits!</h2>
                    <p className="text-xs text-zinc-400 leading-relaxed font-sans">
                      Introduce your luxury events co-attendees or family members to Tripnest. Once they match their first VIP transit guide, you receiving $10 credit.
                    </p>
                  </div>

                  {/* Referral link copier */}
                  <div 
                    onClick={() => {
                      alert('Encrypted referral invite link copied to clipboard!');
                    }}
                    className="p-3 bg-zinc-950 border border-zinc-900 rounded-2xl cursor-pointer hover:border-[#007AFF]/40 flex justify-between items-center text-xs"
                  >
                    <span className="font-mono font-black text-[#007AFF] uppercase text-xs tracking-wider">TRIPNEST-ALEX581</span>
                    <span className="text-[9.5px] uppercase font-black tracking-widest text-zinc-550 block">Copy link</span>
                  </div>
                </div>

                <button onClick={() => setPageNumber(8)} className="w-full bg-[#1A1B22] border border-zinc-805 py-3 rounded-xl text-xs uppercase font-bold text-center">
                  Close Campaign Panel
                </button>
              </div>
            );

          case 40: // Dark Mode Toggle Page
            return (
              <div className="flex flex-col justify-between h-full bg-[#0E1015] p-5 text-left">
                <div className="space-y-4">
                  <header className="pb-1 border-b border-zinc-850">
                    <h2 className="text-xs font-black uppercase tracking-wider text-white">Aesthetics Mode Selector</h2>
                  </header>

                  <div className="space-y-2.5 pt-2">
                    {[
                      { key: 'dark', title: 'Cosmic Obsidian Dark', desc: 'Luxury eye-safe dark theme optimized for evening coastal drives.' },
                      { key: 'light', title: 'Solar Pearl Light', desc: 'High-contrast bright mode suitable for sunny beach transits.' },
                      { key: 'system', title: 'Device System Sync', desc: 'Aligns color aesthetics dynamically based on smartphone timers.' }
                    ].map((mode) => (
                      <div 
                        key={mode.key}
                        onClick={() => {
                          setModeSetting(mode.key as any);
                          alert(`Mock aesthetics updated to: ${mode.title}`);
                        }}
                        className={`p-3 rounded-xl border cursor-pointer transition flex items-center justify-between text-xs ${modeSetting === mode.key ? 'bg-primary/10 border-primary text-[#007AFF]' : 'bg-zinc-950 border-zinc-900 text-zinc-400 hover:border-zinc-700'}`}
                      >
                        <div className="text-left space-y-0.5 leading-tight">
                          <span className="font-bold text-white block">{mode.title}</span>
                          <span className="text-[9.5px] text-zinc-500 block leading-normal">{mode.desc}</span>
                        </div>
                        {modeSetting === mode.key && <Check className="w-4 h-4 text-primary" />}
                      </div>
                    ))}
                  </div>
                </div>

                <button onClick={() => setPageNumber(8)} className="w-full bg-zinc-900 border border-zinc-805 py-3 rounded-xl text-xs uppercase font-bold text-center">
                  Save Color values
                </button>
              </div>
            );

          case 41: // Dedicated Events Catalog Page
            return (
              <div className="flex flex-col justify-between h-full bg-[#0E1015] p-5 text-left select-none overflow-y-auto scrollbar-none pb-14">
                <div className="space-y-4">
                  <header className="pb-2 border-b border-zinc-850">
                    <span className="text-[8.5px] font-mono font-black text-[#007AFF] uppercase tracking-widest block animate-pulse">TRIPNEST CONCIERGE EXCLUSIVE</span>
                    <h2 className="text-sm font-black uppercase text-white mt-0.5">Luxury Club &amp; Festival Calendar</h2>
                  </header>

                  <p className="text-[10px] text-zinc-400 font-medium leading-relaxed font-sans">
                    VIP coordinates and luxury shuttle bookings mapped natively to premium venues in Nairobi.
                  </p>

                  <div className="space-y-3.5 pt-1.5">
                    {events.map((evt) => (
                      <div key={evt.id} className="bg-[#121318] border border-zinc-850/85 rounded-2xl overflow-hidden shadow-lg group hover:border-[#007AFF]/30 transition-all duration-300">
                        {/* Event Thumbnail/Banner */}
                        <div className="w-full h-24 bg-zinc-900 relative">
                          <img 
                            src={evt.imageUrl || `https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=400&q=80`} 
                            alt={evt.name} 
                            className="w-full h-full object-cover group-hover:scale-102 transition"
                            referrerPolicy="no-referrer"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/20 to-transparent" />
                          <div className="absolute bottom-2.5 left-3">
                            <span className="bg-[#007AFF]/20 text-[#007AFF] text-[8px] font-black uppercase px-2 py-0.5 rounded-md border border-[#007AFF]/25 tracking-wide font-mono">
                              {evt.estimatedBudget > 15 ? 'PREMIUM TRANSIT' : 'EXCLUSIVE EXPERIENCES'}
                            </span>
                          </div>
                        </div>

                        {/* Content */}
                        <div className="p-3 space-y-2 text-left">
                          <div className="flex justify-between items-start leading-none">
                            <span className="text-[9px] font-black text-amber-400 uppercase tracking-wider font-mono">{evt.date} • {evt.time}</span>
                            <span className="text-[10px] font-mono text-zinc-400 font-bold">KSH {Math.round(evt.estimatedBudget * 100).toLocaleString()}</span>
                          </div>
                          
                          <div className="text-left leading-tight">
                            <h3 className="font-bold text-xs text-white group-hover:text-[#007AFF] transition">{evt.name}</h3>
                            <p className="text-[9.5px] text-zinc-500 mt-1 flex items-center gap-1 leading-none font-sans">
                              <MapPin className="w-3 h-3 text-zinc-400" />
                              <span>{evt.location}</span>
                            </p>
                          </div>

                          <p className="text-[9px] text-zinc-400 leading-normal font-sans">
                            {evt.description || 'Premium festival event featuring international acts, private lounges, and state-of-the-art acoustics.'}
                          </p>

                          <div className="pt-1 flex gap-2">
                            <button
                              id={`book-now-${evt.id}`}
                              onClick={() => {
                                setSearchQuery({ pickup: 'Nairobi Airport (NBO)', dropoff: evt.location });
                                setBookingCategory('Premium');
                                setPageNumber(11); // Skip straight to Ride Options screen
                                alert(`Pre-populated coordinates for ${evt.name}. Please confirm premium vehicle selection!`);
                              }}
                              className="flex-grow bg-[#007AFF] hover:bg-[#005EC2] text-white font-extrabold text-[9px] uppercase tracking-wider py-2.5 rounded-xl transition duration-300 flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-[#007AFF]/15"
                            >
                              <Calendar className="w-3 h-3 text-white" />
                              <span>Book Now</span>
                            </button>

                            <button
                              id={`info-${evt.id}`}
                              onClick={() => {
                                alert(`Exclusive details for ${evt.name}:\nVenue: ${evt.location}\nDate: ${evt.date} • ${evt.time}\nEstimated Transit: KSH ${Math.round(evt.estimatedBudget * 100)}\n\n${evt.description || 'Premium festival event featuring international acts, private lounges, and state-of-the-art acoustics.'}`);
                              }}
                              className="px-3 bg-[#1A1C24] hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white font-extrabold text-[9px] uppercase tracking-wider py-2.5 rounded-xl transition duration-300 flex items-center justify-center cursor-pointer"
                              title="View Event Details"
                            >
                              <Info className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );

          case 50: // Admin Pricing Panel
            const [adminRoutes, setAdminRoutes] = useState<any[]>([]);
            const [adminNewRoute, setAdminNewRoute] = useState({ from: '', to: '', standard: '', xl: '', premium: '' });
            const [adminLoading, setAdminLoading] = useState(true);
            const adminLoadRoutes = async () => {
              setAdminLoading(true);
              try {
                const resp = await fetch('/api/admin/pricing-routes');
                const data = await resp.json();
                if (data.routes) setAdminRoutes(data.routes);
              } catch {} finally { setAdminLoading(false); }
            };
            React.useEffect(() => { adminLoadRoutes(); }, []);
            const adminSaveRoute = async (id: string, standard: number, xl: number, premium: number, active: boolean) => {
              await fetch(`/api/admin/pricing-routes/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ standard, xl, premium, active }),
              });
              adminLoadRoutes();
            };
            const adminAddRoute = async () => {
              if (!adminNewRoute.from || !adminNewRoute.to) return;
              await fetch('/api/admin/pricing-routes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  from: adminNewRoute.from, to: adminNewRoute.to,
                  standard: Number(adminNewRoute.standard),
                  xl: Number(adminNewRoute.xl),
                  premium: Number(adminNewRoute.premium),
                }),
              });
              setAdminNewRoute({ from: '', to: '', standard: '', xl: '', premium: '' });
              adminLoadRoutes();
            };
            return (
              <div className="flex flex-col h-full bg-[#0E1015] text-left overflow-hidden">
                <header className="p-4 bg-[#0A0C10] border-b border-zinc-850 flex items-center justify-between shrink-0">
                  <h2 className="text-xs font-black uppercase tracking-wider text-white">Admin: Pricing Routes</h2>
                  <button onClick={() => setPageNumber(8)} className="p-1 hover:bg-zinc-800 rounded-lg text-zinc-400">
                    <X className="w-4 h-4" />
                  </button>
                </header>
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {adminLoading ? (
                    <div className="flex items-center justify-center py-10">
                      <div className="w-5 h-5 border-2 border-[#007AFF] border-t-transparent rounded-full animate-spin" />
                    </div>
                  ) : (
                    <>
                      <div className="space-y-1">
                        {adminRoutes.map((r: any) => (
                          <div key={r.id} className="bg-zinc-950 border border-zinc-900 rounded-xl p-3 text-[11px] space-y-2">
                            <div className="flex items-center justify-between text-[10px] text-zinc-400 font-mono">
                              <span>{r.from} → {r.to}</span>
                              <button
                                onClick={() => adminSaveRoute(r.id, r.standard, r.xl, r.premium, !r.active)}
                                className={`text-[8px] font-black uppercase px-2 py-0.5 rounded ${r.active ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}
                              >
                                {r.active ? 'Active' : 'Inactive'}
                              </button>
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                              {['standard', 'xl', 'premium'].map((key) => (
                                <div key={key} className="flex items-center gap-1">
                                  <span className="text-[8px] uppercase text-zinc-600 w-6">{key.slice(0, 3)}</span>
                                  <input
                                    type="number"
                                    defaultValue={(r as any)[key]}
                                    onBlur={(e) => {
                                      const val = Number(e.target.value);
                                      const upd: any = { standard: r.standard, xl: r.xl, premium: r.premium, active: r.active };
                                      upd[key] = val;
                                      adminSaveRoute(r.id, upd.standard, upd.xl, upd.premium, upd.active);
                                    }}
                                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-2 py-1 text-xs text-white text-center"
                                  />
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="bg-[#121318] border border-zinc-800 rounded-xl p-3 space-y-2">
                        <span className="text-[9px] font-black uppercase text-[#007AFF] block">Add New Route</span>
                        <div className="grid grid-cols-2 gap-2">
                          <input value={adminNewRoute.from} onChange={e => setAdminNewRoute({...adminNewRoute, from: e.target.value})} placeholder="From" className="bg-zinc-900 border border-zinc-800 rounded-lg px-2 py-1.5 text-xs text-white" />
                          <input value={adminNewRoute.to} onChange={e => setAdminNewRoute({...adminNewRoute, to: e.target.value})} placeholder="To" className="bg-zinc-900 border border-zinc-800 rounded-lg px-2 py-1.5 text-xs text-white" />
                          <input value={adminNewRoute.standard} onChange={e => setAdminNewRoute({...adminNewRoute, standard: e.target.value})} placeholder="Standard" type="number" className="bg-zinc-900 border border-zinc-800 rounded-lg px-2 py-1.5 text-xs text-white" />
                          <input value={adminNewRoute.xl} onChange={e => setAdminNewRoute({...adminNewRoute, xl: e.target.value})} placeholder="XL" type="number" className="bg-zinc-900 border border-zinc-800 rounded-lg px-2 py-1.5 text-xs text-white" />
                          <input value={adminNewRoute.premium} onChange={e => setAdminNewRoute({...adminNewRoute, premium: e.target.value})} placeholder="Premium" type="number" className="bg-zinc-900 border border-zinc-800 rounded-lg px-2 py-1.5 text-xs text-white" />
                        </div>
                        <button onClick={adminAddRoute} className="w-full bg-[#007AFF] hover:bg-[#007AFF]/90 text-white font-bold py-2 rounded-xl text-xs">Add Route</button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            );

          case 45: // Unified Bookings Dashboard Page
            return (
              <div className="flex flex-col justify-between h-full bg-[#0E1015] p-5 text-left select-none overflow-y-auto scrollbar-none pb-14">
                <div className="space-y-4">
                  <header className="pb-2 border-b border-zinc-850">
                    <span className="text-[8.5px] font-mono font-black text-[#007AFF] uppercase tracking-widest block font-sans">TRANSIT CONTROL MATRIX</span>
                    <h2 className="text-sm font-black uppercase text-white mt-0.5">Your VIP Bookings Portfolio</h2>
                  </header>

                  <p className="text-[10px] text-zinc-400 font-medium leading-relaxed font-sans">
                    View active dispatches, schedule new on-demand event shuttles, or inspect historical transit receipts.
                  </p>

                  {/* Active Ride Card */}
                  {activeBooking ? (
                    <div className="bg-[#1C1215]/45 border-2 border-red-500/20 rounded-2xl p-3.5 space-y-2.5 relative overflow-hidden">
                      <div className="absolute right-0 top-0 w-8 h-8 rounded-bl-full bg-red-500/10 flex items-center justify-center">
                        <span className="w-2 h-2 rounded-full bg-red-550 animate-ping" />
                      </div>
                      <div className="text-left leading-none">
                        <span className="text-[8px] font-black text-red-400 uppercase tracking-widest block font-mono">ACTIVE DISPATCH LIVE</span>
                        <h4 className="text-sm font-black text-white mt-1 leading-none">Dispatched {activeBooking.category} Black</h4>
                      </div>
                      <div className="text-[10px] space-y-1 text-zinc-350 bg-zinc-950/80 p-2.5 rounded-xl border border-zinc-900 leading-normal font-sans">
                        <p className="truncate"><strong className="text-zinc-500 font-mono text-[9px]">FROM:</strong> {activeBooking.pickup}</p>
                        <p className="truncate"><strong className="text-[#007AFF] font-mono text-[9px]">TO:</strong> {activeBooking.destination}</p>
                        <p className="pt-1.5 border-t border-zinc-900/80 font-mono flex justify-between">
                          <span>PRICE:</span>
                          <span className="font-bold text-amber-400">KES {activeBooking.fare?.amount || activeBooking.originalPrice}</span>
                        </p>
                      </div>
                      <button 
                        onClick={() => {
                          setPageNumber(15); // Redirect instantly to active tracking cockpit
                        }}
                        className="w-full bg-[#007AFF] hover:bg-[#007AFF]/90 text-white font-black text-[9px] uppercase tracking-wider py-2.5 rounded-xl transition cursor-pointer text-center"
                      >
                        Open Live Dispatch Cockpit
                      </button>
                    </div>
                  ) : (
                    <div className="bg-[#121318] border border-zinc-850 p-4 rounded-2xl text-center space-y-2.5">
                      <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary mx-auto">
                        <Calendar className="w-5 h-5 text-primary" />
                      </div>
                      <div className="space-y-1">
                        <h4 className="text-xs font-bold text-white">No Active Dispatches</h4>
                        <p className="text-[9.5px] text-zinc-500 max-w-[220px] mx-auto leading-normal font-sans">
                          Ready to reserve premium transport? Specify coordinates inside the explore tab or select an upcoming event.
                        </p>
                      </div>
                      <button
                        onClick={() => setPageNumber(8)}
                        className="bg-[#007AFF] hover:bg-[#007AFF]/85 text-white font-bold text-[9px] px-4 py-2 rounded-lg uppercase tracking-wider transition cursor-pointer"
                      >
                        Book Ride Now
                      </button>
                    </div>
                  )}

                  {/* Booking History logs List */}
                  <div className="space-y-2 pt-2 text-left">
                    <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest block font-mono">HISTORICAL LOGS ({bookings.length})</span>
                    {bookings.length > 0 ? (
                      <div className="space-y-2">
                        {bookings.map((bk) => (
                          <div 
                            key={bk.id} 
                            onClick={() => {
                              setPageNumber(28); // Open detailed trip overview
                            }}
                            className="bg-zinc-900/60 hover:bg-zinc-900 border border-zinc-850/60 p-3 rounded-xl flex items-center justify-between cursor-pointer transition"
                          >
                            <div className="text-left leading-tight min-w-0 flex-grow pr-3">
                              <span className="text-[8.5px] font-black text-[#007AFF] uppercase font-mono tracking-wider">{bk.category} Vehicle</span>
                              <h4 className="text-[10.5px] font-bold text-white truncate mt-0.5">{bk.destination}</h4>
                              <span className="text-[8px] text-zinc-500 block font-mono mt-0.5">ID: {bk.id.substring(0, 11)}</span>
                            </div>
                            <ChevronRight className="w-4 h-4 text-zinc-500 shrink-0" />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-3 bg-zinc-900/30 border border-zinc-850 rounded-xl text-center italic text-zinc-500 text-[10px] font-sans">
                        No rides on file yet.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );

          default:
            return <div className="p-6 text-zinc-400 italic">Page element loading error. Switch indices to retry.</div>;
        }
      })()}
    </div>
  );
}
