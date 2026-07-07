export type VehicleCategory = "standard" | "xl" | "premium";
export type RideType = "private" | "cost_sharing";
export type RideStatus =
  | "requested"
  | "accepted"
  | "in_progress"
  | "rejected"
  | "completed"
  | "cancelled";
export type Role = "client" | "driver";

export interface Client {
  id: string;
  name: string;
  phone: string;
  email: string;
  avatar_url: string | null;
  emergency_contact: string | null;
  share_rides: boolean;
  created_at: string;
}

export interface Driver {
  id: string;
  name: string;
  phone: string;
  vehicle_type: string;
  plate_number: string;
  current_location: string | null;
  frequent_location: string | null;
  vehicle_category: VehicleCategory;
  is_available: boolean;
  created_at: string;
}

export interface EventItem {
  id: string;
  name: string;
  location: string;
  event_date: string;
  estimated_budget: number;
  image_url: string | null;
  created_at: string;
}

export interface Ride {
  id: string;
  client_id: string | null;
  driver_id: string | null;
  event_id: string | null;
  pickup: string;
  destination: string;
  scheduled_at: string | null;
  vehicle_category: VehicleCategory;
  ride_type: RideType;
  budget: number;
  status: RideStatus;
  rejected_by: string[];
  verification_code: string;
  payment_status: PaymentStatus;
  mpesa_receipt: string | null;
  created_at: string;
}

export type PaymentStatus = "unpaid" | "pending" | "paid" | "failed";

// Ride joined with related client/driver/event (for dashboards)
export interface RideWithRelations extends Ride {
  client?: Client | null;
  driver?: Driver | null;
  event?: EventItem | null;
}

export const VEHICLE_CATEGORIES: {
  value: VehicleCategory;
  label: string;
  description: string;
}[] = [
  { value: "standard", label: "Standard", description: "Comfortable everyday rides" },
  { value: "xl", label: "XL", description: "Extra space, up to 6 seats" },
  { value: "premium", label: "Premium", description: "Top-tier vehicles & drivers" },
];

export const RIDE_TYPES: { value: RideType; label: string; description: string }[] = [
  { value: "private", label: "Private ride", description: "Just you and your group" },
  {
    value: "cost_sharing",
    label: "Cost sharing",
    description: "Share the ride and split the cost",
  },
];
