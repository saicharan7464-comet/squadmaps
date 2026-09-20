import { LatLng } from './navigation';

export type PlaceCategory = 
  | 'restaurant'
  | 'hotel'
  | 'petrol'
  | 'ev_charging'
  | 'hospital'
  | 'atm'
  | 'parking'
  | 'attraction'
  | 'shopping'
  | 'cafe'
  | 'airport'
  | 'station';

export interface Place {
  id: string;
  name: string;
  category: PlaceCategory;
  coordinates: LatLng;
  address: string;
  rating?: number;
  userRatingsTotal?: number;
  openNow?: boolean;
  distanceFromUser?: number; // meters
}

export interface PlaceSuggestion {
  id: string;
  squadId: string;
  createdBy: string;
  createdByName: string;
  place: Place;
  votes: Record<string, boolean>; // userId -> true (yes) / false (no)
  status: 'open' | 'accepted' | 'rejected';
  createdAt: number;
}
