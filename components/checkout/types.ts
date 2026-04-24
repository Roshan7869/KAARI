export type CourierKey = 'INDIA_POST' | 'TIRUPATI_BALAJI' | 'DTDC' | 'DELHIVERY' | 'BLUEDART' | 'OTHER';

export const COURIER_OPTIONS: Array<{ key: CourierKey; label: string; eta: string; badge?: string; icon: string }> = [
  { key: 'INDIA_POST',      label: 'India Post',               eta: '7–10 days', badge: 'Economy',  icon: '📮' },
  { key: 'TIRUPATI_BALAJI', label: 'Tirupati Balaji Couriers', eta: '4–7 days',  badge: 'Standard', icon: '🚚' },
  { key: 'DTDC',            label: 'DTDC',                     eta: '3–5 days',  badge: 'Express',  icon: '📦' },
  { key: 'DELHIVERY',       label: 'Delhivery',                eta: '2–4 days',  badge: 'Fast',     icon: '⚡' },
  { key: 'BLUEDART',        label: 'Blue Dart (DHL)',           eta: '1–3 days',  badge: 'Premium',  icon: '✈️'  },
  { key: 'OTHER',           label: 'Other (specify below)',     eta: 'Varies',                       icon: '✏️'  },
];

export interface SavedAddress {
  id: string;
  label: string;
  full_name: string;
  phone: string;
  address_line1: string;
  address_line2: string | null;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  is_default: boolean;
}
