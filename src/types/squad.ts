import { LatLng, Route, VehicleMode } from './navigation';

export type MemberStatus = 'active' | 'behind' | 'arrived' | 'paused' | 'offline';

export interface SquadMember {
  userId: string;
  name: string;
  profileImage: string;
  color: string;
  latitude: number;
  longitude: number;
  speed: number; // km/h
  heading: number; // degrees
  accuracy: number; // meters
  lastUpdated: number; // timestamp ms
  eta: string; // e.g. "5:42 PM"
  etaSeconds: number; // seconds remaining to destination
  distanceRemaining: number; // meters remaining to destination
  status: MemberStatus;
  online: boolean;
  vehicleMode: VehicleMode;
  isHost?: boolean;
  locationSharingPaused?: boolean;
  
  // Computed client-side relative to viewing user
  distanceFromUser?: number; // meters between current user and this member
  relativePosition?: 'ahead' | 'behind' | 'with_you';
  distanceDifferenceWithUser?: number; // delta in distance to destination (positive = behind you, negative = ahead of you)
}

export interface RegroupPoint {
  id: string;
  suggestedBy: string;
  suggestedByName: string;
  coordinates: LatLng;
  name: string;
  description?: string;
  votes: Record<string, boolean>; // userId -> true/false
  status: 'proposed' | 'accepted' | 'rejected';
  createdAt: number;
}

export interface SquadSettings {
  allowMemberVehicleChange: boolean;
  fallingBehindThresholdKm: number; // default: 3 km
  fallingBehindThresholdMins: number; // default: 7 mins
  autoReroute: boolean;
}

export interface Squad {
  squadId: string;
  code: string; // Public squad code, e.g. "SQ-W0K6"
  hostId: string;
  hostName: string;
  name: string;
  destination: string;
  destinationCoordinates: LatLng;
  vehicleMode: VehicleMode;
  createdAt: number;
  expiresAt?: number; // Expiration timestamp in ms
  status: 'active' | 'ended';
  canonicalRoute: Route;
  settings: SquadSettings;
  activeRegroupPoint?: RegroupPoint | null;
  members?: SquadMember[];
}

export interface SquadProgress {
  totalMembers: number;
  arrivedCount: number;
  enRouteCount: number;
  behindCount: number;
  offlineCount: number;
  members: SquadMember[];
}
