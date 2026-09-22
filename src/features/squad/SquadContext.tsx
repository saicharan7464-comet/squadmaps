import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Squad, SquadMember, SquadProgress, RegroupPoint, SquadSettings } from '../../types/squad';
import { Route, LatLng, VehicleMode } from '../../types/navigation';
import { ChatMessage, QuickActionType } from '../../types/chat';
import { Place, PlaceSuggestion } from '../../types/places';
import { squadDataService } from '../../services/firebase/squadDataService';
import { useAuth } from '../auth/AuthContext';
import { haversineDistance } from '../../utils/geo';
import { soundService } from '../../services/audio/soundService';

interface SquadContextType {
  squad: Squad | null;
  members: SquadMember[];
  enrichedMembers: SquadMember[];
  messages: ChatMessage[];
  suggestions: PlaceSuggestion[];
  squadProgress: SquadProgress;
  isHost: boolean;
  activeRegroupPoint: RegroupPoint | null;
  fallingBehindAlert: string | null;
  arrivalNotification: string | null;
  focusedMemberId: string | null;

  // Actions
  createSquad: (
    name: string,
    destination: string,
    destinationCoordinates: LatLng,
    vehicleMode: VehicleMode,
    canonicalRoute: Route,
    hostCustomName?: string
  ) => Promise<string>;
  joinSquad: (squadId: string, initialCoords?: LatLng, customUserName?: string) => Promise<boolean>;
  leaveSquad: () => Promise<void>;
  updateMyLocation: (
    coords: LatLng,
    speed: number,
    heading: number,
    accuracy: number,
    distanceRemaining: number,
    etaString: string,
    etaSeconds: number,
    isPaused?: boolean
  ) => Promise<void>;
  sendChat: (text: string, quickAction?: QuickActionType) => Promise<void>;
  suggestPlace: (place: Place) => Promise<void>;
  votePlace: (suggestionId: string, vote: boolean) => Promise<void>;
  proposeRegroup: (name: string, coordinates: LatLng) => Promise<void>;
  voteRegroup: (accept: boolean) => Promise<void>;
  setFocusedMemberId: (id: string | null) => void;

  // Host Controls
  renameSquad: (name: string) => Promise<void>;
  changeDestination: (destination: string, coordinates: LatLng, route: Route) => Promise<void>;
  removeMember: (userId: string) => Promise<void>;
  endSquad: () => Promise<void>;
  updateSettings: (settings: Partial<SquadSettings>) => Promise<void>;
}

const SquadContext = createContext<SquadContextType | undefined>(undefined);

export const SquadProvider: React.FC<{
  children: React.ReactNode;
  userCoords: LatLng | null;
}> = ({ children, userCoords }) => {
  const { user, updateProfileName } = useAuth();
  const [squad, setSquad] = useState<Squad | null>(null);
  const [members, setMembers] = useState<SquadMember[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [fallingBehindAlert, setFallingBehindAlert] = useState<string | null>(null);
  const [arrivalNotification, setArrivalNotification] = useState<string | null>(null);
  const [focusedMemberId, setFocusedMemberId] = useState<string | null>(null);

  const prevArrivedMembersRef = useRef<Set<string>>(new Set());
  const lastAlertTimeRef = useRef<number>(0);

  // Subscribe to real-time squad data when squadId is set
  useEffect(() => {
    if (!squad?.squadId) return;

    const unsubSquad = squadDataService.subscribeToSquad(squad.squadId, (updated) => {
      setSquad(updated);
    });

    const unsubMembers = squadDataService.subscribeToMembers(squad.squadId, (updatedMembers) => {
      setMembers(updatedMembers);
    });

    const unsubMessages = squadDataService.subscribeToMessages(squad.squadId, (updatedMsgs) => {
      setMessages(updatedMsgs);
    });

    const unsubSuggestions = squadDataService.subscribeToSuggestions(squad.squadId, (updatedSuggestions) => {
      setSuggestions(updatedSuggestions);
    });

    return () => {
      unsubSquad();
      unsubMembers();
      unsubMessages();
      unsubSuggestions();
    };
  }, [squad?.squadId]);

  // Check arrival notifications & falling behind alerts
  useEffect(() => {
    if (!user || !squad || members.length === 0) return;

    // 1. Arrival checks
    members.forEach((m) => {
      if (m.status === 'arrived' && !prevArrivedMembersRef.current.has(m.userId)) {
        prevArrivedMembersRef.current.add(m.userId);
        setArrivalNotification(`🎉 ${m.name} has arrived at ${squad.destination}!`);
        soundService.playArrivalFanfare();
        setTimeout(() => setArrivalNotification(null), 8000);
      }
    });

    // 2. Falling behind alerts for viewing user
    const currentUserMember = members.find((m) => m.userId === user.id);
    if (!currentUserMember) return;

    const thresholdKm = squad.settings?.fallingBehindThresholdKm || 3;
    const thresholdMins = squad.settings?.fallingBehindThresholdMins || 7;
    const now = Date.now();

    // Alert if any member is significantly behind the user (rate limited to once every 45 seconds)
    if (now - lastAlertTimeRef.current > 45000) {
      const behindMember = members.find((m) => {
        if (m.userId === user.id || m.status === 'arrived' || !m.online) return false;
        const deltaDistanceMeters = m.distanceRemaining - currentUserMember.distanceRemaining;
        const deltaKm = deltaDistanceMeters / 1000;
        const deltaSeconds = m.etaSeconds - currentUserMember.etaSeconds;
        const deltaMins = deltaSeconds / 60;
        return deltaKm > thresholdKm || deltaMins > thresholdMins;
      });

      if (behindMember) {
        const deltaKm = ((behindMember.distanceRemaining - currentUserMember.distanceRemaining) / 1000).toFixed(1);
        const alertMsg = `⚠️ ${behindMember.name} is ${deltaKm} km behind the squad!`;
        setFallingBehindAlert(alertMsg);
        soundService.playAlertChime();
        lastAlertTimeRef.current = now;
        setTimeout(() => setFallingBehindAlert(null), 7000);
      }
    }
  }, [members, user, squad]);

  // Compute inter-member distance from viewing user and relative position
  const enrichedMembers = useMemo(() => {
    if (!userCoords) return members;

    const currentMember = members.find((m) => m.userId === user?.id);

    return members.map((m) => {
      const distFromUser = haversineDistance(userCoords, { lat: m.latitude, lng: m.longitude });
      let relativePosition: 'ahead' | 'behind' | 'with_you' = 'with_you';
      let deltaDist = 0;

      if (currentMember) {
        deltaDist = m.distanceRemaining - currentMember.distanceRemaining;
        if (deltaDist > 150) {
          relativePosition = 'behind';
        } else if (deltaDist < -150) {
          relativePosition = 'ahead';
        }
      }

      return {
        ...m,
        distanceFromUser: Math.round(distFromUser),
        relativePosition,
        distanceDifferenceWithUser: Math.round(deltaDist)
      };
    });
  }, [members, userCoords, user?.id]);

  // Squad progress summary
  const squadProgress: SquadProgress = useMemo(() => {
    let arrivedCount = 0;
    let enRouteCount = 0;
    let behindCount = 0;
    let offlineCount = 0;

    members.forEach((m) => {
      if (!m.online || m.status === 'offline') {
        offlineCount++;
      } else if (m.status === 'arrived') {
        arrivedCount++;
      } else if (m.status === 'behind') {
        behindCount++;
      } else {
        enRouteCount++;
      }
    });

    return {
      totalMembers: members.length,
      arrivedCount,
      enRouteCount,
      behindCount,
      offlineCount,
      members: enrichedMembers
    };
  }, [members, enrichedMembers]);

  const isHost = Boolean(user && squad && squad.hostId === user.id);

  // CREATE SQUAD
  const createSquad = async (
    name: string,
    destination: string,
    destinationCoordinates: LatLng,
    vehicleMode: VehicleMode,
    canonicalRoute: Route,
    hostCustomName?: string
  ): Promise<string> => {
    if (!user) throw new Error('User must be logged in to create a squad');

    const effectiveHostName = hostCustomName?.trim() || user.name;
    if (hostCustomName?.trim() && hostCustomName.trim() !== user.name) {
      updateProfileName(hostCustomName.trim());
    }

    // Generate unique squad ID (e.g. "SQ-92A4")
    const squadId = `SQ-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    const newSquad: Squad = {
      squadId,
      hostId: user.id,
      hostName: effectiveHostName,
      name,
      destination,
      destinationCoordinates,
      vehicleMode,
      createdAt: Date.now(),
      status: 'active',
      canonicalRoute,
      settings: {
        allowMemberVehicleChange: true,
        fallingBehindThresholdKm: 3,
        fallingBehindThresholdMins: 7,
        autoReroute: true
      },
      activeRegroupPoint: null
    };

    await squadDataService.saveSquad(newSquad);

    // Add host as first squad member
    const hostMember: SquadMember = {
      userId: user.id,
      name: effectiveHostName,
      profileImage: user.avatar,
      color: user.color,
      latitude: userCoords?.lat || canonicalRoute.polyline[0]?.lat || 0,
      longitude: userCoords?.lng || canonicalRoute.polyline[0]?.lng || 0,
      speed: 0,
      heading: 0,
      accuracy: 10,
      lastUpdated: Date.now(),
      eta: 'Calculating...',
      etaSeconds: canonicalRoute.duration,
      distanceRemaining: canonicalRoute.distance,
      status: 'active',
      online: true,
      vehicleMode,
      isHost: true
    };

    await squadDataService.updateMember(squadId, hostMember);
    setSquad(newSquad);
    return squadId;
  };

  // JOIN SQUAD
  const joinSquad = async (
    squadId: string,
    initialCoords?: LatLng,
    customUserName?: string
  ): Promise<boolean> => {
    if (!user) return false;

    const effectiveMemberName = customUserName?.trim() || user.name;
    if (customUserName?.trim() && customUserName.trim() !== user.name) {
      updateProfileName(customUserName.trim());
    }

    const existingSquad = await squadDataService.getSquad(squadId);
    if (!existingSquad || existingSquad.status === 'ended') {
      return false;
    }

    const startLat = initialCoords?.lat || userCoords?.lat || existingSquad.canonicalRoute.polyline[0]?.lat || 0;
    const startLng = initialCoords?.lng || userCoords?.lng || existingSquad.canonicalRoute.polyline[0]?.lng || 0;

    const member: SquadMember = {
      userId: user.id,
      name: effectiveMemberName,
      profileImage: user.avatar,
      color: user.color,
      latitude: startLat,
      longitude: startLng,

      speed: 0,
      heading: 0,
      accuracy: 10,
      lastUpdated: Date.now(),
      eta: 'Calculating...',
      etaSeconds: existingSquad.canonicalRoute.duration,
      distanceRemaining: existingSquad.canonicalRoute.distance,
      status: 'active',
      online: true,
      vehicleMode: existingSquad.vehicleMode,
      isHost: existingSquad.hostId === user.id
    };

    await squadDataService.updateMember(squadId, member);
    setSquad(existingSquad);

    // Send arrival/join announcement in chat
    await squadDataService.sendMessage(squadId, {
      id: `msg-${Date.now()}`,
      squadId,
      senderId: user.id,
      senderName: effectiveMemberName,
      senderAvatar: user.avatar,
      senderColor: user.color,
      text: `${effectiveMemberName} joined the squad!`,
      type: 'alert',
      timestamp: Date.now()
    });

    return true;
  };

  // LEAVE SQUAD
  const leaveSquad = async () => {
    if (!user || !squad) return;
    await squadDataService.removeMember(squad.squadId, user.id);
    setSquad(null);
    setMembers([]);
    setMessages([]);
    setSuggestions([]);
  };

  // UPDATE LOCATION
  const updateMyLocation = useCallback(
    async (
      coords: LatLng,
      speed: number,
      heading: number,
      accuracy: number,
      distanceRemaining: number,
      etaString: string,
      etaSeconds: number,
      isPaused = false
    ) => {
      if (!user || !squad) return;

      // Determine status
      let status: SquadMember['status'] = 'active';
      if (isPaused) {
        status = 'paused';
      } else if (distanceRemaining <= 60) {
        status = 'arrived';
      } else if (members.length > 1) {
        // Compare with lead member
        const minDistance = Math.min(...members.map((m) => m.distanceRemaining));
        const deltaKm = (distanceRemaining - minDistance) / 1000;
        if (deltaKm > (squad.settings?.fallingBehindThresholdKm || 3)) {
          status = 'behind';
        }
      }

      const updatedMember: SquadMember = {
        userId: user.id,
        name: user.name,
        profileImage: user.avatar,
        color: user.color,
        latitude: coords.lat,
        longitude: coords.lng,
        speed,
        heading,
        accuracy,
        lastUpdated: Date.now(),
        eta: etaString,
        etaSeconds,
        distanceRemaining,
        status,
        online: true,
        vehicleMode: squad.vehicleMode,
        isHost,
        locationSharingPaused: isPaused
      };

      await squadDataService.updateMember(squad.squadId, updatedMember);
    },
    [user, squad, isHost, members]
  );

  // CHAT
  const sendChat = async (text: string, quickAction?: QuickActionType) => {
    if (!user || !squad) return;
    const msg: ChatMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      squadId: squad.squadId,
      senderId: user.id,
      senderName: user.name,
      senderAvatar: user.avatar,
      senderColor: user.color,
      text,
      type: quickAction ? 'quick_action' : 'chat',
      quickAction,
      timestamp: Date.now()
    };
    await squadDataService.sendMessage(squad.squadId, msg);
  };

  // PLACES
  const suggestPlace = async (place: Place) => {
    if (!user || !squad) return;
    const suggestion: PlaceSuggestion = {
      id: `sug-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      squadId: squad.squadId,
      createdBy: user.id,
      createdByName: user.name,
      place,
      votes: { [user.id]: true }, // Creator votes yes by default
      status: 'open',
      createdAt: Date.now()
    };
    await squadDataService.saveSuggestion(squad.squadId, suggestion);
    sendChat(`Suggested stop: ${place.name} (${place.category})`);
  };

  const votePlace = async (suggestionId: string, vote: boolean) => {
    if (!user || !squad) return;
    await squadDataService.voteSuggestion(squad.squadId, suggestionId, user.id, vote);
  };

  // REGROUP
  const proposeRegroup = async (name: string, coordinates: LatLng) => {
    if (!user || !squad) return;
    const regroupPoint: RegroupPoint = {
      id: `regroup-${Date.now()}`,
      suggestedBy: user.id,
      suggestedByName: user.name,
      coordinates,
      name,
      votes: { [user.id]: true },
      status: 'proposed',
      createdAt: Date.now()
    };
    await squadDataService.setRegroupPoint(squad.squadId, regroupPoint);
    sendChat(`Proposed regroup point: "${name}". Let's meet here!`, 'meet_here');
  };

  const voteRegroup = async (accept: boolean) => {
    if (!user || !squad || !squad.activeRegroupPoint) return;
    const currentPoint = squad.activeRegroupPoint;
    const updatedVotes = { ...currentPoint.votes, [user.id]: accept };

    const totalVotes = Object.keys(updatedVotes).length;
    const yesVotes = Object.values(updatedVotes).filter(Boolean).length;
    const isAccepted = yesVotes >= Math.ceil(members.length / 2);

    const updatedPoint: RegroupPoint = {
      ...currentPoint,
      votes: updatedVotes,
      status: isAccepted ? 'accepted' : currentPoint.status
    };

    await squadDataService.setRegroupPoint(squad.squadId, updatedPoint);
  };

  // HOST CONTROLS
  const renameSquad = async (name: string) => {
    if (!isHost || !squad) return;
    const updated = { ...squad, name };
    await squadDataService.saveSquad(updated);
  };

  const changeDestination = async (destination: string, coordinates: LatLng, route: Route) => {
    if (!isHost || !squad) return;
    const updated: Squad = {
      ...squad,
      destination,
      destinationCoordinates: coordinates,
      canonicalRoute: route
    };
    await squadDataService.saveSquad(updated);
    sendChat(`Destination updated to: ${destination}`);
  };

  const removeMember = async (userId: string) => {
    if (!isHost || !squad) return;
    await squadDataService.removeMember(squad.squadId, userId);
  };

  const endSquad = async () => {
    if (!isHost || !squad) return;
    const updated: Squad = { ...squad, status: 'ended' };
    await squadDataService.saveSquad(updated);
    sendChat('The host has ended the squad session.');
  };

  const updateSettings = async (settings: Partial<SquadSettings>) => {
    if (!isHost || !squad) return;
    const updated: Squad = {
      ...squad,
      settings: { ...squad.settings, ...settings }
    };
    await squadDataService.saveSquad(updated);
  };

  return (
    <SquadContext.Provider
      value={{
        squad,
        members,
        enrichedMembers,
        messages,
        suggestions,
        squadProgress,
        isHost,
        activeRegroupPoint: squad?.activeRegroupPoint || null,
        fallingBehindAlert,
        arrivalNotification,
        focusedMemberId,
        createSquad,
        joinSquad,
        leaveSquad,
        updateMyLocation,
        sendChat,
        suggestPlace,
        votePlace,
        proposeRegroup,
        voteRegroup,
        setFocusedMemberId,
        renameSquad,
        changeDestination,
        removeMember,
        endSquad,
        updateSettings
      }}
    >
      {children}
    </SquadContext.Provider>
  );
};

export const useSquad = () => {
  const context = useContext(SquadContext);
  if (!context) {
    throw new Error('useSquad must be used within a SquadProvider');
  }
  return context;
};
