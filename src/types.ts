export type VehicleCategory = 'Standard' | 'XL' | 'Premium';
export type RideType = 'Private' | 'Cost Sharing';

export interface Passenger {
  id: string;
  name: string;
  phone: string;
  email: string;
  tripsCount: number;
  rating: number;
  premium: boolean;
  avatarUrl: string;
  isRegistered: boolean;
}

export interface Driver {
  id: string;
  name: string;
  phone: string;
  vehicleType: string; // e.g., 'Tesla Model 3'
  carPlate: string;
  currentLocation: string;
  frequentLocation: string;
  category: VehicleCategory;
  rating: number;
  tripsCount: number;
  isOnline: boolean; // Toggle availability ON/OFF
  isFavorite: boolean; // Saved by the client
  avatarUrl: string;
  isRegistered: boolean;
}

export interface Booking {
  id: string;
  eventId?: string; // Optional if booked generic or to event
  eventName?: string;
  pickup: string;
  destination: string;
  dateTime: string; // Date & Time combined
  budget: number; // Transport budget in USD
  category: VehicleCategory; // Standard, XL, Premium
  rideType: RideType; // Private, Cost Sharing
  driverId: string | null; // Currently assigned driver
  status: 'searching' | 'accepted' | 'en_route' | 'completed' | 'cancelled' | 'rejected_by_all';
  rejectedDriverIds: string[]; // Driver IDs who rejected this ride
  availableDriverPool: string[]; // Remaining driver IDs to ask
  originalPrice: number;
  otpCode?: string;
  driverArrived?: boolean;
  isStarted?: boolean;
  // Payment fields
  paymentMethod?: 'mpesa' | 'card' | 'cash';
  paymentStatus?: 'unpaid' | 'pending' | 'paid' | 'failed' | 'refunded';
  transactionId?: string;
  mpesaPhone?: string;
}

export interface DriverNotification {
  id: string;
  bookingId: string;
  driverId: string;
  pickup: string;
  destination: string;
  dateTime: string;
  budget: number;
  rideType: RideType;
  category: VehicleCategory;
  status: 'pending' | 'accepted' | 'rejected';
}

export interface EventItem {
  id: string;
  name: string;
  location: string;
  date: string;
  time: string;
  estimatedBudget: number; // base pricing in USD
  driverIds: string[]; // Drivers initially available for this event
  imageUrl: string;
  description: string;
}

export interface PaymentMethod {
  id: string;
  type: 'paypal' | 'mpesa' | 'card';
  label: string; // e.g. "Visa", "Safaricom M-Pesa", "PayPal"
  details: string; // e.g. "**** 4242", "0712 *** 345", "user@domain.com"
  cardholderName?: string;
  expiryDate?: string;
  isDefault: boolean;
  // Real payment identifiers
  mpesaPhone?: string;
  stripePaymentMethodId?: string;
}

export interface Transaction {
  id: string;
  bookingId: string;
  userId: string;
  driverId?: string;
  amount: number;
  currency: 'USD' | 'KES';
  method: 'mpesa' | 'card' | 'cash';
  mpesaReceiptCode?: string;
  stripePaymentIntentId?: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  description?: string;
  createdAt: string;
  completedAt?: string;
}

