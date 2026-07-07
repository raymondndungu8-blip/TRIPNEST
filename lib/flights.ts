export interface Flight {
  id: string;
  airline: string;
  flightNo: string;
  country: string;
  city: string;
  departure: string; // ISO datetime
  terminal: string;
}

function inDays(days: number, hour: number, minute: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

/** Mock departures from JKIA — seeded for the prototype flight board. */
export const FLIGHTS: Flight[] = [
  {
    id: "kq100",
    airline: "Kenya Airways",
    flightNo: "KQ100",
    country: "United Kingdom",
    city: "London",
    departure: inDays(0, 22, 30),
    terminal: "JKIA · Terminal 1A",
  },
  {
    id: "ek721",
    airline: "Emirates",
    flightNo: "EK721",
    country: "United Arab Emirates",
    city: "Dubai",
    departure: inDays(1, 1, 15),
    terminal: "JKIA · Terminal 1A",
  },
  {
    id: "qr1373",
    airline: "Qatar Airways",
    flightNo: "QR1373",
    country: "Qatar",
    city: "Doha",
    departure: inDays(1, 9, 45),
    terminal: "JKIA · Terminal 1A",
  },
  {
    id: "et306",
    airline: "Ethiopian Airlines",
    flightNo: "ET306",
    country: "Ethiopia",
    city: "Addis Ababa",
    departure: inDays(1, 14, 20),
    terminal: "JKIA · Terminal 1B",
  },
  {
    id: "kl566",
    airline: "KLM",
    flightNo: "KL566",
    country: "Netherlands",
    city: "Amsterdam",
    departure: inDays(2, 23, 50),
    terminal: "JKIA · Terminal 1A",
  },
  {
    id: "tk608",
    airline: "Turkish Airlines",
    flightNo: "TK608",
    country: "Turkey",
    city: "Istanbul",
    departure: inDays(3, 3, 10),
    terminal: "JKIA · Terminal 1A",
  },
  {
    id: "sa178",
    airline: "South African Airways",
    flightNo: "SA178",
    country: "South Africa",
    city: "Johannesburg",
    departure: inDays(3, 11, 0),
    terminal: "JKIA · Terminal 1B",
  },
];
