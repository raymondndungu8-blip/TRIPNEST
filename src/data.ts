import { Driver, EventItem, Passenger } from './types';

export const INITIAL_PASSENGER: Passenger = {
  id: 'passenger-alex',
  name: 'Alex Morgan',
  phone: '+254 712 111 222',
  email: 'alex.morgan@tripnest.com',
  tripsCount: 124,
  rating: 4.9,
  premium: true,
  avatarUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDAkN2sjAghN6YyW68eLB8J8Oc9djQOWYXfgJyPwgObqK_BXAOxevJiXXUV149psWdQjlw4zlY01txfyLo9izNvxQ1epsJwDnGxA0yUFRPDUctCn2JjhERcVEuCAQ5f6riDg5wREMLmweih5k5VjyHPwlOj27y66PNvRU-wcK1Ob7G9wMcFWhpEI7HP78I9Ie_o08mycf47VY3k0KSFWjUqdAP7K2TWn4_NT5BI_JjembZmCrY0ddtUWNDq55W-Dyk7plFVrl04Unk',
  isRegistered: false // Can be switched to false to show the signup view
};

export const INITIAL_DRIVERS: Driver[] = [
  {
    id: 'driver-marcus',
    name: 'Marcus Vance',
    phone: '+254 712 345 678',
    vehicleType: 'Black Tesla Model 3',
    carPlate: 'TRP-NEST 01',
    currentLocation: 'Westlands, Nairobi',
    frequentLocation: 'Westlands & Kilimani',
    category: 'Premium',
    rating: 4.9,
    tripsCount: 1485,
    isOnline: true, // Availability ON
    isFavorite: false,
    avatarUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAcImM9G9KHbLRdzHUQusmLX5-zJDCQZPhHAr1PqqithjcwWUJXNqo58-YaARN0wBsZrm_J7a9o7XgRis9xafkpwypbWrtAPVcjO31o5IbwF_ozMiUa2mHfX3S8fSKbR7fxyJje1yPlpQTyypo9EHdREB0PcBMDwAxAxP3rxfzEuFraeB-q3YvZFp4TOkEj4_z782t-QfRVTWUs4VnLPOAfQRc3_kSobsdPa8SUFCCBLD_m5cMHm0NAfK7eLafV5b5Z2PmS77fCc4Q',
    isRegistered: true
  },
  {
    id: 'driver-sarah',
    name: 'Sarah Jenkins',
    phone: '+254 722 001 002',
    vehicleType: 'Nissan Leaf Electric',
    carPlate: 'TRP-NEST 02',
    currentLocation: 'Kilifi Beach Road',
    frequentLocation: 'Kilifi Coast & Mombasa',
    category: 'Standard',
    rating: 4.8,
    tripsCount: 924,
    isOnline: true,
    isFavorite: true, // Preset as favorite to show top-tier list display
    avatarUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDezuaH2rZkPYNWDTI6emva2hq_RCbcajdbiKYYnDe4A19zlzji_tpK8y6AH15rxvu5n33RHEL_0Vh4bitb_K_uyV-dJ-S-pXFv3BdOJPcq9l6IRkSUNiRsC1D-KOQcTSDBv2NHTKVc6vAo71Y3irta0SDFjQxNX2hKDZn__WT02s6qfURGcu16UbOkQ9pd13m9XiV8Ii_Rrz2A8S2IxFwVIw0lnNs6Ofkp_TqOPkqk0sqzwxT040VECX_18qprf4knaqKOOwxGpVE',
    isRegistered: true
  },
  {
    id: 'driver-david',
    name: 'David Ndungu',
    phone: '+254 733 999 888',
    vehicleType: 'Toyota Alphard XL',
    carPlate: 'TRP-NEST 03',
    currentLocation: 'Westlands, Nairobi',
    frequentLocation: 'Nairobi Airport & CBD',
    category: 'XL',
    rating: 4.95,
    tripsCount: 412,
    isOnline: true,
    isFavorite: false,
    avatarUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDszusC2Cj3gE3IqajK0wCrvl7iT8uzleLlenYlsiKtydGXCoQKtv1eEBvJPuRxyqC5JFk35SdNX2E7OuAchXeWKjxEhZcHF03w2owoR91ixCdtaJCfKoU-ZDmD7D-csR8LHzY99wZMebQD0rf7X6LVT-eUX7TxogBdVH6OSkE6SqX94YdYV0ygpV12NrwAol4rJQHX7RHrGcmyT_5Fg6kFwkEYA3Pv-I4lLPAVKL6ozJnOWOn2BoqIIepwZ-3-_6KMxaZloDltJFs',
    isRegistered: true
  },
  {
    id: 'driver-elena',
    name: 'Elena Rostova',
    phone: '+254 701 444 555',
    vehicleType: 'Luxury Audi A6 Sedan',
    carPlate: 'TRP-NEST 04',
    currentLocation: 'Kilimani, Nairobi',
    frequentLocation: 'Westlands & Karen',
    category: 'Premium',
    rating: 4.7,
    tripsCount: 630,
    isOnline: true,
    isFavorite: false,
    avatarUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuB575QRmxvimLaLGBG9cWCFON3KE2okzjxV2OlWLJvp91k1Hh6a6lhXAwZ1V3VQv3j51OfKr02w6dK88QCRZXXs-QWdnkes8TpmwYZoLGOGuDFqc-Xd3MlX299JaJYUgehMK8bGLjk_K3amifaS-ngit7n8uhrEunhK0d1WkF_1xMs2S2BHz-3ggRVfISYm4yJuV-afN7Wk0SoAnlxX2K3EqD__QozU_dS65PNPGWn8yPSVB_1x0DOe_TdJmwjfeY909rLcVOH7BYU',
    isRegistered: true
  }
];

export const EVENTS_DATA: EventItem[] = [
  {
    id: 'event-summertides',
    name: 'Summertides Festival',
    location: 'Coastal Arena, Kilifi',
    date: 'August 14, 2026',
    time: '14:00',
    estimatedBudget: 45.00, // Budget in USD
    driverIds: ['driver-sarah', 'driver-david', 'driver-elena'],
    imageUrl: 'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?auto=format&fit=crop&w=600&q=80',
    description: 'Immerse yourself in coastal beats, electronic and amapiano waves alongside a vibrant beach atmosphere at the premium Kilifi Summertides Music & Sunset gathering.'
  },
  {
    id: 'event-diani',
    name: 'Diani Beach Festival',
    location: 'Safari Beach Club, Diani',
    date: 'December 28, 2026',
    time: '12:00',
    estimatedBudget: 60.00,
    driverIds: ['driver-sarah', 'driver-david'],
    imageUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=600&q=80',
    description: 'The ultimate beachside tropical vibe under stellar skies. Elite live sets, pristine white sands, volleyball tournaments, and customized luxury travel options.'
  },
  {
    id: 'event-nightrun',
    name: 'Nairobi Night Run',
    location: 'Alchemist Bar & Streets, Westlands',
    date: 'June 20, 2026',
    time: '20:00',
    estimatedBudget: 15.00,
    driverIds: ['driver-marcus', 'driver-david', 'driver-elena'],
    imageUrl: 'https://images.unsplash.com/photo-1502224562085-639556652f33?auto=format&fit=crop&w=600&q=80',
    description: 'A glowing fitness run through illuminated metropolitan highways in Nairobi, finished off with energetic electronic dance afterparties.'
  }
];
