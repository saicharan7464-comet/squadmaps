export interface LatLng {
  lat: number;
  lng: number;
}

export type VehicleMode = 'car' | 'motorcycle' | 'walking' | 'bicycle' | 'transit';

export interface RouteManeuver {
  type: string; // 'turn', 'merge', 'depart', 'arrive', 'roundabout', etc.
  modifier?: string; // 'left', 'right', 'slight left', 'sharp right', 'straight', etc.
  instruction: string;
}

export interface RouteStep {
  instruction: string;
  distance: number; // meters
  duration: number; // seconds
  startLocation: LatLng;
  endLocation: LatLng;
  maneuver: RouteManeuver;
  streetName?: string;
}

export interface Route {
  id: string;
  name: string;
  distance: number; // meters
  duration: number; // seconds
  summary: string;
  polyline: LatLng[]; // decoded array of coordinates
  steps: RouteStep[];
  bounds?: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
  trafficDelay?: number; // seconds
}

export interface NavigationState {
  isActive: boolean;
  isNavigating: boolean;
  activeRoute: Route | null;
  currentStepIndex: number;
  currentStep: RouteStep | null;
  nextStep: RouteStep | null;
  distanceToNextStep: number; // meters
  distanceRemaining: number; // meters
  durationRemaining: number; // seconds
  etaString: string; // formatted time e.g. "5:42 PM"
  currentSpeed: number; // km/h
  heading: number; // degrees (0-360)
  isOffRoute: boolean;
  voiceMuted: boolean;
  recenterNeeded: boolean;
}
