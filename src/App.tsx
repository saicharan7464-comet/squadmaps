import React, { useState, useEffect, useRef } from 'react';
import { AuthProvider, useAuth } from './features/auth/AuthContext';
import { SquadProvider, useSquad } from './features/squad/SquadContext';
import { useLocationTracker } from './features/tracking/useLocationTracker';
import { useTurnByTurn } from './features/navigation/useTurnByTurn';
import { MapView } from './components/map/MapView';
import { TurnByTurnHUD } from './components/navigation/TurnByTurnHUD';
import { PlaceSearchBox } from './components/places/PlaceSearchBox';
import { SquadPanel } from './components/squad/SquadPanel';
import { SquadChatDrawer } from './components/chat/SquadChatDrawer';
import { RegroupModal } from './components/regroup/RegroupModal';
import { PlaceVotingBanner } from './components/places/PlaceVotingBanner';
import { HostSettingsModal } from './components/host/HostSettingsModal';
import { CreateSquadWizard } from './components/host/CreateSquadWizard';
import { HomePage } from './pages/HomePage';
import { JoinSquadPage } from './pages/JoinSquadPage';
import { routingProvider } from './services/routing';
import { Place } from './types/places';
import { Route, LatLng, VehicleMode } from './types/navigation';
import { SquadMember } from './types/squad';
import { squadDataService } from './services/squad/squadDataService';
import { nominatimPlacesProvider } from './services/places/nominatimPlacesProvider';
import { parseSquadId } from './utils/inviteUrl';
import {
  Users,
  MessageSquare,
  Navigation,
  Play,
  Pause,
  AlertTriangle,
  ChevronUp,
  ChevronDown,
  Sparkles,
  Home,
  X,
  MapPin,
  Car,
  Bike,
  Footprints,
  Menu
} from 'lucide-react';

import { GlobalHeader } from './components/common/GlobalHeader';
import { MobileBottomNav } from './components/common/MobileBottomNav';
import { UserAccountModal } from './components/auth/UserAccountModal';

type AppView = 'home' | 'join' | 'map';

const NavigationCockpit: React.FC<{
  onGoHome: () => void;
  openCreateSquadOnMount?: boolean;
  autoStartNavigationOnMount?: boolean;
  onOpenAccount?: () => void;
  openSquadPanelTrigger?: number;
}> = ({
  onGoHome,
  openCreateSquadOnMount = false,
  autoStartNavigationOnMount = false,
  onOpenAccount,
  openSquadPanelTrigger = 0
}) => {
  const { user, updateProfileName } = useAuth();
  const {
    squad,
    members,
    enrichedMembers,
    messages,
    suggestions,
    squadProgress,
    isHost,
    activeRegroupPoint,
    fallingBehindAlert,
    arrivalNotification,
    focusedMemberId,
    sessionEndedNotice,
    clearSessionEndedNotice,
    createSquad,
    updateMyLocation,
    sendChat,
    suggestPlace,
    votePlace,
    proposeRegroup,
    voteRegroup,
    setFocusedMemberId,
    renameSquad,
    removeMember,
    endSquad,
    updateSettings
  } = useSquad();

  // Location Tracker
  const location = useLocationTracker();

  // Responsive state
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth <= 768);
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Navigation State
  const [activeRoute, setActiveRoute] = useState<Route | null>(squad?.canonicalRoute || null);
  const [isNavigating, setIsNavigating] = useState(
    Boolean(autoStartNavigationOnMount && squad?.canonicalRoute && (isHost || squad?.settings?.navigationStarted))
  );
  const [selectedDestination, setSelectedDestination] = useState<Place | null>(null);

  // UI Drawers & Modals
  const [isCreateSquadOpen, setIsCreateSquadOpen] = useState(openCreateSquadOnMount);
  const [isSquadPanelOpen, setIsSquadPanelOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isRegroupOpen, setIsRegroupOpen] = useState(false);
  const [isHostSettingsOpen, setIsHostSettingsOpen] = useState(false);

  useEffect(() => {
    if (openSquadPanelTrigger > 0) {
      setIsSquadPanelOpen(true);
    }
  }, [openSquadPanelTrigger]);

  // Google Maps-Style Meeting Point Selection ("Let's Meet Here")
  const [isSelectingMeetingPoint, setIsSelectingMeetingPoint] = useState(false);
  const [selectedMeetingCoords, setSelectedMeetingCoords] = useState<LatLng | null>(null);
  const [selectedMeetingName, setSelectedMeetingName] = useState<string>('');
  const [mapCenterPoint, setMapCenterPoint] = useState<LatLng | null>(null);
  const [previewMeetingRoute, setPreviewMeetingRoute] = useState<Route | null>(null);

  // Destination Search & Alternative Routes State (Flow B)
  const [availableRoutes, setAvailableRoutes] = useState<Route[]>([]);
  const [selectedTransportMode, setSelectedTransportMode] = useState<VehicleMode>('car');
  const [isCalculatingRoutes, setIsCalculatingRoutes] = useState<boolean>(false);

  // Flow B: Short Create Squad Modal
  const [isShortCreateSquadOpen, setIsShortCreateSquadOpen] = useState(false);
  const [shortHostName, setShortHostName] = useState(user?.name || '');
  const [shortGroupName, setShortGroupName] = useState('');
  const [shortSquadError, setShortSquadError] = useState<string | null>(null);
  const [isSubmittingShortSquad, setIsSubmittingShortSquad] = useState(false);

  // Demo / Convoy Simulator Mode
  const [isConvoyDemoActive, setIsConvoyDemoActive] = useState(false);
  const convoyIntervalRef = useRef<any>(null);

  // Sync active route with squad canonical route or recalculate from member position to destination
  useEffect(() => {
    if (squad?.canonicalRoute) {
      if (autoStartNavigationOnMount && (isHost || squad?.settings?.navigationStarted)) {
        setIsNavigating(true);
      }
      if (!isHost && location.coordinates && squad.destinationCoordinates) {
        routingProvider
          .calculateRoutes(location.coordinates, squad.destinationCoordinates, squad.vehicleMode || 'car')
          .then((routes) => {
            if (routes && routes.length > 0) {
              setActiveRoute(routes[0]);
            } else {
              setActiveRoute(squad.canonicalRoute);
            }
          })
          .catch(() => {
            setActiveRoute(squad.canonicalRoute);
          });
      } else {
        setActiveRoute(squad.canonicalRoute);
      }
    } else {
      // Squad ended or left: clean up navigation, HUD, and panels
      setActiveRoute(null);
      setIsNavigating(false);
      setSelectedDestination(null);
      setIsSquadPanelOpen(false);
      setIsHostSettingsOpen(false);
      setIsChatOpen(false);
      setIsRegroupOpen(false);
      if (isConvoyDemoActive) {
        clearInterval(convoyIntervalRef.current);
        setIsConvoyDemoActive(false);
      }
    }
  }, [squad?.canonicalRoute, squad?.squadId, location.coordinates, isHost, autoStartNavigationOnMount, squad?.settings?.navigationStarted]);

  // Sync member navigation state with host's navigationStarted setting
  useEffect(() => {
    if (!isHost && squad) {
      if (squad.settings?.navigationStarted) {
        if (!isNavigating) {
          setIsNavigating(true);
          setIsSquadPanelOpen(false);
        }
      } else {
        if (isNavigating) {
          setIsNavigating(false);
        }
      }
    }
  }, [isHost, squad?.settings?.navigationStarted]);


  // Turn-by-turn engine
  const turnByTurn = useTurnByTurn({
    route: activeRoute,
    currentLocation: location.coordinates,
    currentSpeed: location.speed,
    isNavigating,
    onRerouteNeeded: async () => {
      if (!location.coordinates || !activeRoute) return;
      const endPoint = activeRoute.polyline[activeRoute.polyline.length - 1];
      const recalculated = await routingProvider.calculateRoutes(
        location.coordinates,
        endPoint,
        squad?.vehicleMode || 'car'
      );
      if (recalculated.length > 0) {
        setActiveRoute(recalculated[0]);
      }
    },
    onArrival: () => {
      setIsNavigating(false);
    }
  });

  // Broadcast current user's live coordinates & metrics to squad
  useEffect(() => {
    if (!location.coordinates || !squad) return;

    updateMyLocation(
      location.coordinates,
      location.speed,
      location.heading,
      location.accuracy,
      turnByTurn.distanceRemaining || (activeRoute ? activeRoute.distance : 0),
      turnByTurn.etaString,
      turnByTurn.durationRemaining || (activeRoute ? activeRoute.duration : 0),
      location.isSharingPaused
    );
  }, [
    location.coordinates,
    location.speed,
    location.heading,
    location.accuracy,
    location.isSharingPaused,
    turnByTurn.distanceRemaining,
    turnByTurn.durationRemaining,
    turnByTurn.etaString,
    squad,
    activeRoute,
    updateMyLocation
  ]);

  // Destination Search Selection (Normal Navigation Mode)
  const handleSelectPlace = async (place: Place, modeOverride?: VehicleMode) => {
    setSelectedDestination(place);
    const mode = modeOverride || selectedTransportMode;
    const origin: LatLng = location.coordinates || { lat: 17.385, lng: 78.4867 };
    setIsCalculatingRoutes(true);
    try {
      const calculatedRoutes = await routingProvider.calculateRoutes(
        origin,
        place.coordinates,
        mode
      );
      if (calculatedRoutes && calculatedRoutes.length > 0) {
        setAvailableRoutes(calculatedRoutes);
        setActiveRoute(calculatedRoutes[0]);
      } else {
        setAvailableRoutes([]);
        setActiveRoute(null);
      }
    } catch (err) {
      console.warn('Route calculation error:', err);
      setAvailableRoutes([]);
      setActiveRoute(null);
    } finally {
      setIsCalculatingRoutes(false);
    }
  };

  const handleChangeTransportMode = (mode: VehicleMode) => {
    setSelectedTransportMode(mode);
    if (selectedDestination) {
      handleSelectPlace(selectedDestination, mode);
    }
  };

  const handleOpenShortCreateSquad = () => {
    setShortHostName(user?.name || '');
    setShortGroupName(selectedDestination ? `${selectedDestination.name} Trip` : 'Squad Trip');
    setShortSquadError(null);
    setIsShortCreateSquadOpen(true);
  };

  const handleShortCreateSquadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shortHostName.trim()) {
      setShortSquadError('Please enter a host name.');
      return;
    }
    if (!shortGroupName.trim()) {
      setShortSquadError('Please enter a squad name.');
      return;
    }
    if (!selectedDestination || !activeRoute) {
      setShortSquadError('No destination route selected.');
      return;
    }

    setIsSubmittingShortSquad(true);
    setShortSquadError(null);
    try {
      updateProfileName(shortHostName.trim());
      await createSquad(
        shortGroupName.trim(),
        selectedDestination.name,
        selectedDestination.coordinates,
        selectedTransportMode,
        activeRoute,
        shortHostName.trim()
      );
      setIsShortCreateSquadOpen(false);
      setSelectedDestination(null);
      setAvailableRoutes([]);
      setIsSquadPanelOpen(true);
    } catch (err: any) {
      console.error('Failed to create squad (Flow B):', err);
      setShortSquadError(err?.message || 'Failed to create squad. Please try again.');
    } finally {
      setIsSubmittingShortSquad(false);
    }
  };

  const calculateMeetingPointPreviewRoute = async (targetCoords: LatLng) => {
    const origin: LatLng = location.coordinates || { lat: 17.385, lng: 78.4867 };
    try {
      const routes = await routingProvider.calculateRoutes(origin, targetCoords, squad?.vehicleMode || 'car');
      if (routes && routes.length > 0) {
        setPreviewMeetingRoute(routes[0]);
      }
    } catch (err) {
      console.warn('Failed to calculate preview route to meeting point:', err);
    }
  };

  // Start Navigation
  const handleStartNavigation = () => {
    if (!activeRoute) return;
    setIsNavigating(true);
    setIsSquadPanelOpen(false);
    if (squad && isHost) {
      updateSettings({ navigationStarted: true });
    }
  };

  // Exit Navigation
  const handleExitNavigation = () => {
    setIsNavigating(false);
    if (squad && isHost) {
      updateSettings({ navigationStarted: false });
    }
  };

  // Google Maps-Style Meeting Point Handlers
  const handleStartSelectingMeetingPoint = () => {
    setIsSelectingMeetingPoint(true);
    setSelectedMeetingCoords(null);
    setSelectedMeetingName('');
    setPreviewMeetingRoute(null);
    setIsSquadPanelOpen(false);
  };

  const handleCancelMeetingPoint = () => {
    setIsSelectingMeetingPoint(false);
    setSelectedMeetingCoords(null);
    setSelectedMeetingName('');
    setPreviewMeetingRoute(null);
    setIsSquadPanelOpen(true);
  };

  const handleConfirmMeetingPoint = async () => {
    if (!selectedMeetingCoords) return;
    const finalName = selectedMeetingName.trim() || 'Regroup Point';
    await proposeRegroup(finalName, selectedMeetingCoords);
    setIsSelectingMeetingPoint(false);
    setSelectedMeetingCoords(null);
    setSelectedMeetingName('');
    setPreviewMeetingRoute(null);
    setIsSquadPanelOpen(true);
  };

  const handleMapClick = async (coords: LatLng) => {
    if (isSelectingMeetingPoint) {
      setSelectedMeetingCoords(coords);
      setSelectedMeetingName('Locating address...');
      calculateMeetingPointPreviewRoute(coords);
      try {
        const address = await nominatimPlacesProvider.reverseGeocode(coords);
        const cleanName = address ? address.split(',').slice(0, 3).join(', ') : 'Selected Meeting Point';
        setSelectedMeetingName(cleanName);
      } catch {
        setSelectedMeetingName('Selected Meeting Point');
      }
    }
  };

  // Locate Member on Map
  const handleLocateMember = (member: SquadMember) => {
    setFocusedMemberId(member.userId);
  };

  // Convoy Simulator Mode (Allows full testing on desktop without driving)
  const toggleConvoySimulator = () => {
    if (isConvoyDemoActive) {
      // Stop simulation
      if (convoyIntervalRef.current) clearInterval(convoyIntervalRef.current);
      location.stopSimulation();
      setIsConvoyDemoActive(false);
    } else {
      if (!activeRoute) {
        alert('Please search a destination or create a squad first to simulate route convoy!');
        return;
      }
      setIsConvoyDemoActive(true);
      location.startSimulation(activeRoute.polyline, 65);

      // Also simulate 2 virtual squad companions along the route
      let stepOffset = 0;
      convoyIntervalRef.current = setInterval(() => {
        stepOffset++;
        const poly = activeRoute.polyline;
        const total = poly.length;

        const friend1Idx = Math.min(total - 1, Math.floor(stepOffset * 1.8));
        const friend2Idx = Math.min(total - 1, Math.max(0, Math.floor(stepOffset * 1.1) - 15)); // Falling behind friend

        if (squad && poly.length > 0) {
          // Update virtual friend 1 (Rahul - slightly ahead or on track)
          const rahulCoords = poly[friend1Idx] || poly[0];
          // Update virtual friend 2 (Arjun - trailing behind)
          const arjunCoords = poly[friend2Idx] || poly[0];

          squadDataService.updateMember(squad.squadId, {
            userId: 'virtual_rahul',
            name: 'Rahul (Convoy)',
            profileImage: 'https://api.dicebear.com/7.x/bottts/svg?seed=rahul',
            color: '#00F0FF',
            latitude: rahulCoords.lat,
            longitude: rahulCoords.lng,
            speed: 68,
            heading: 45,
            accuracy: 5,
            lastUpdated: Date.now(),
            eta: '5:42 PM',
            etaSeconds: 1800,
            distanceRemaining: Math.max(0, activeRoute.distance - friend1Idx * 80),
            status: 'active',
            online: true,
            vehicleMode: squad.vehicleMode
          });

          squadDataService.updateMember(squad.squadId, {
            userId: 'virtual_arjun',
            name: 'Arjun (Convoy)',
            profileImage: 'https://api.dicebear.com/7.x/bottts/svg?seed=arjun',
            color: '#FF3D71',
            latitude: arjunCoords.lat,
            longitude: arjunCoords.lng,
            speed: 42,
            heading: 45,
            accuracy: 8,
            lastUpdated: Date.now(),
            eta: '6:15 PM',
            etaSeconds: 3800,
            distanceRemaining: Math.max(0, activeRoute.distance - friend2Idx * 80),
            status: 'behind',
            online: true,
            vehicleMode: squad.vehicleMode
          });
        }
      }, 1000);
    }
  };

  // Clean up simulator on unmount
  useEffect(() => {
    return () => {
      if (convoyIntervalRef.current) clearInterval(convoyIntervalRef.current);
    };
  }, []);

  const openSuggestions = suggestions.filter((s) => s.status === 'open');

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden' }}>
      {/* Fullscreen Map */}
      <MapView
        userLocation={location.coordinates}
        userHeading={location.heading}
        userSpeed={location.speed}
        route={activeRoute}
        squadMembers={enrichedMembers}
        destination={
          squad?.destinationCoordinates ||
          (selectedDestination ? selectedDestination.coordinates : null)
        }
        destinationName={squad?.destination || selectedDestination?.name}
        regroupPoint={activeRegroupPoint}
        previewPoint={selectedMeetingCoords}
        previewPointName={selectedMeetingName}
        previewRoute={previewMeetingRoute}
        centerPoint={mapCenterPoint}
        focusedMemberId={focusedMemberId}
        onMemberClick={handleLocateMember}
        onMapClick={handleMapClick}
        isNavigating={isNavigating}
      />

      {/* Top Turn-by-Turn HUD (When Navigating) */}
      {isNavigating && (
        <TurnByTurnHUD
          currentStep={turnByTurn.currentStep}
          nextStep={turnByTurn.nextStep}
          distanceToNextStep={turnByTurn.distanceToNextStep}
          distanceRemaining={turnByTurn.distanceRemaining}
          durationRemaining={turnByTurn.durationRemaining}
          etaString={turnByTurn.etaString}
          currentSpeed={location.speed}
          isOffRoute={turnByTurn.isOffRoute}
          voiceMuted={turnByTurn.voiceMuted}
          onToggleVoice={turnByTurn.toggleVoiceMute}
          onExitNavigation={handleExitNavigation}
          squadMemberCount={squad ? members.length : undefined}
          isSquadOpen={isSquadPanelOpen}
          onToggleSquad={() => {
            setIsSquadPanelOpen((prev) => !prev);
          }}
          onToggleChat={squad ? () => setIsChatOpen((prev) => !prev) : undefined}
          isChatOpen={isChatOpen}
          hasUnreadMessages={messages.length > 0}
        />
      )}

      {/* Session Ended Alert Banner */}
      {sessionEndedNotice && (
        <div
          className="cockpit-card animate-slide-down"
          style={{
            position: 'absolute',
            top: '16px',
            left: '16px',
            right: '16px',
            maxWidth: '480px',
            margin: '0 auto',
            zIndex: 99,
            padding: '12px 16px',
            backgroundColor: 'rgba(239, 68, 68, 0.95)',
            border: '1.5px solid var(--accent-red)',
            color: '#FFFFFF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            boxShadow: 'var(--shadow-xl)',
            borderRadius: 'var(--radius-md)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <AlertTriangle size={20} color="#FFFFFF" style={{ flexShrink: 0 }} />
            <span style={{ fontSize: '13px', fontWeight: 700 }}>{sessionEndedNotice}</span>
          </div>
          <button
            type="button"
            onClick={clearSessionEndedNotice}
            style={{
              background: 'rgba(255, 255, 255, 0.2)',
              border: 'none',
              borderRadius: 'var(--radius-sm)',
              color: '#FFFFFF',
              padding: '4px 8px',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Three-horizontal-lines (Hamburger) Button to open Squad Convoy */}
      {!isSelectingMeetingPoint && (
        <button
          type="button"
          onClick={() => {
            if (squad) {
              setIsSquadPanelOpen((prev) => !prev);
            } else {
              setIsCreateSquadOpen(true);
            }
          }}
          className="cockpit-card"
          style={{
            position: 'absolute',
            left: '12px',
            top: isNavigating ? '112px' : '118px',
            zIndex: 40,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            height: '32px',
            padding: '0 10px',
            borderRadius: '999px',
            backgroundColor: isSquadPanelOpen && squad ? 'rgba(0, 240, 255, 0.16)' : 'rgba(10, 15, 29, 0.94)',
            border: isSquadPanelOpen && squad ? '1.5px solid var(--accent-cyan)' : '1px solid rgba(0, 240, 255, 0.25)',
            boxShadow: '0 4px 14px rgba(0, 0, 0, 0.55)',
            cursor: 'pointer',
            color: '#FFFFFF',
            transition: 'all 0.18s ease',
            whiteSpace: 'nowrap'
          }}
          title={squad ? (isSquadPanelOpen ? 'Close Squad Convoy' : 'Open Squad Convoy') : 'Create Squad'}
          aria-label="Toggle Squad Convoy menu"
        >
          <Menu size={15} color="var(--accent-cyan)" style={{ flexShrink: 0 }} />
          {squad ? (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
              <span style={{ fontSize: '11px', fontWeight: 800, color: '#FFFFFF', letterSpacing: '0.04em', lineHeight: 1 }}>
                CONVOY
              </span>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minWidth: '17px',
                  height: '17px',
                  padding: '0 4px',
                  borderRadius: '999px',
                  backgroundColor: 'rgba(0, 240, 255, 0.22)',
                  border: '1px solid var(--accent-cyan)',
                  color: 'var(--accent-cyan)',
                  fontSize: '10px',
                  fontWeight: 800,
                  lineHeight: 1
                }}
              >
                {members.length}
              </span>
            </div>
          ) : (
            <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', lineHeight: 1 }}>
              Squad
            </span>
          )}
        </button>
      )}

      {/* Top Search Bar & Header (When NOT Navigating and NOT selecting meeting point) */}
      {!isNavigating && !isSelectingMeetingPoint && (
        <div
          style={{
            position: 'absolute',
            top: '16px',
            left: '12px',
            right: '12px',
            zIndex: 'var(--z-controls)',
            maxWidth: '560px',
            margin: '0 auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            boxSizing: 'border-box'
          }}
        >
          {/* Top Bar with Home Button, Search, and Squad Indicator */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%' }}>
            <button
              className="btn-icon"
              onClick={onGoHome}
              title="Go to Home"
              style={{ flexShrink: 0, width: isMobile ? '40px' : '44px', height: isMobile ? '40px' : '44px' }}
            >
              <Home size={isMobile ? 18 : 20} color="var(--accent-cyan)" />
            </button>

            <div style={{ flex: 1, minWidth: 0 }}>
              <PlaceSearchBox
                userLocation={location.coordinates}
                onSelectPlace={handleSelectPlace}
                onSuggestToSquad={squad ? (place) => suggestPlace(place) : undefined}
                isSquadActive={Boolean(squad)}
                placeholder={
                  squad ? `Searching stops near ${squad.destination}...` : 'Search destination...'
                }
              />
            </div>

            {squad && (
              <button
                className="btn-icon"
                onClick={() => setIsChatOpen(true)}
                title="Squad Chat Radio"
                style={{
                  flexShrink: 0,
                  width: isMobile ? '40px' : '44px',
                  height: isMobile ? '40px' : '44px',
                  position: 'relative'
                }}
              >
                <MessageSquare size={isMobile ? 18 : 20} color="var(--accent-cyan)" />
                {messages.length > 0 && (
                  <span
                    style={{
                      position: 'absolute',
                      top: '6px',
                      right: '6px',
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      backgroundColor: 'var(--accent-green)'
                    }}
                  />
                )}
              </button>
            )}

            {onOpenAccount && (
              <button
                type="button"
                className="btn-icon"
                onClick={onOpenAccount}
                title={`Account (${user?.name || 'Pilot'})`}
                style={{
                  flexShrink: 0,
                  width: isMobile ? '40px' : '44px',
                  height: isMobile ? '40px' : '44px',
                  padding: '3px'
                }}
              >
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    backgroundColor: user?.color || 'var(--accent-cyan)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden'
                  }}
                >
                  <img
                    src={user?.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${user?.id || 'pilot'}`}
                    alt=""
                    style={{ width: '100%', height: '100%' }}
                  />
                </div>
              </button>
            )}
          </div>

          {/* Active Route Summary Bar if route selected */}
          {activeRoute && !squad && (
            <div
              className="cockpit-card animate-slide-down"
              style={{
                padding: '16px 18px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                backgroundColor: 'rgba(10, 15, 29, 0.96)',
                border: '1px solid var(--border-medium)',
                boxShadow: 'var(--shadow-xl)'
              }}
            >
              {/* Transport Mode Selector */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '10px' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Transport Mode
                </span>
                <div style={{ display: 'flex', gap: '6px' }}>
                  {[
                    { id: 'car' as VehicleMode, label: 'Car', icon: Car },
                    { id: 'motorcycle' as VehicleMode, label: 'Bike', icon: Bike },
                    { id: 'bicycle' as VehicleMode, label: 'Cycle', icon: Bike },
                    { id: 'walking' as VehicleMode, label: 'Walk', icon: Footprints }
                  ].map((mode) => {
                    const Icon = mode.icon;
                    const isSelected = selectedTransportMode === mode.id;
                    return (
                      <button
                        key={mode.id}
                        type="button"
                        onClick={() => handleChangeTransportMode(mode.id)}
                        disabled={isCalculatingRoutes}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          padding: '5px 12px',
                          borderRadius: '999px',
                          fontSize: '11px',
                          fontWeight: 700,
                          backgroundColor: isSelected ? 'var(--accent-primary)' : 'var(--bg-surface)',
                          color: isSelected ? '#FFFFFF' : 'var(--text-secondary)',
                          border: `1px solid ${isSelected ? 'var(--accent-primary)' : 'var(--border-subtle)'}`,
                          boxShadow: isSelected ? '0 0 10px rgba(0, 102, 255, 0.35)' : 'none',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <Icon size={12} color={isSelected ? 'var(--accent-cyan)' : 'currentColor'} />
                        <span>{mode.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Route Alternatives List */}
              {availableRoutes.length > 1 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '180px', overflowY: 'auto' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>
                    Available Routes ({availableRoutes.length})
                  </div>
                  {availableRoutes.map((r, idx) => {
                    const isSelected = activeRoute?.id === r.id || activeRoute?.name === r.name;
                    return (
                      <div
                        key={r.id || idx}
                        onClick={() => setActiveRoute(r)}
                        style={{
                          padding: '8px 12px',
                          borderRadius: 'var(--radius-sm)',
                          backgroundColor: isSelected ? 'rgba(0, 240, 255, 0.15)' : 'rgba(255, 255, 255, 0.04)',
                          border: isSelected ? '1.5px solid var(--accent-cyan)' : '1px solid var(--border-subtle)',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: 800, color: isSelected ? '#FFFFFF' : 'var(--text-secondary)' }}>
                            {r.name || `Route ${idx + 1}`}
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                            {Math.round(r.distance / 1000)} km • ~{Math.round(r.duration / 60)} min
                          </div>
                        </div>
                        {isSelected ? (
                          <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--accent-cyan)' }}>
                            Selected
                          </span>
                        ) : (
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                            Select
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700 }}>
                      SELECTED ROUTE
                    </div>
                    <div style={{ fontSize: '15px', fontWeight: 800, color: '#FFFFFF' }}>
                      {activeRoute.name}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                      {Math.round(activeRoute.distance / 1000)} km • ~{Math.round(activeRoute.duration / 60)} min
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons: Create Squad (Flow B), Start Nav, Clear */}
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', justifyContent: 'flex-end', paddingTop: '6px', borderTop: '1px solid var(--border-subtle)' }}>
                <button
                  type="button"
                  onClick={handleOpenShortCreateSquad}
                  className="btn-secondary"
                  style={{ fontSize: '13px', padding: '8px 14px' }}
                >
                  <Users size={16} color="var(--accent-cyan)" />
                  <span>Create Squad</span>
                </button>
                <button
                  type="button"
                  onClick={handleStartNavigation}
                  className="btn-primary"
                  style={{ fontSize: '13px', padding: '8px 16px' }}
                >
                  <Navigation size={16} />
                  <span>Start Nav</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveRoute(null);
                    setSelectedDestination(null);
                    setAvailableRoutes([]);
                  }}
                  className="btn-icon"
                  title="Clear Route"
                  style={{ width: '36px', height: '36px' }}
                >
                  <X size={16} color="var(--text-muted)" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Floating Alert Banners (Falling Behind, Arrival, Place Voting) */}
      <div
        style={{
          position: 'absolute',
          top: isNavigating ? '154px' : '158px',
          left: '16px',
          right: '16px',
          zIndex: 'var(--z-hud)',
          maxWidth: '520px',
          margin: '0 auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          pointerEvents: 'none'
        }}
      >
        {/* Falling Behind Alert */}
        {fallingBehindAlert && (
          <div
            className="glass-panel animate-slide-down"
            style={{
              padding: '12px 16px',
              backgroundColor: 'rgba(255, 61, 113, 0.95)',
              border: '1.5px solid var(--accent-red)',
              color: '#FFFFFF',
              fontWeight: 700,
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}
          >
            <AlertTriangle size={20} color="#FFFFFF" />
            <span>{fallingBehindAlert}</span>
          </div>
        )}

        {/* Arrival Celebration Notification */}
        {arrivalNotification && (
          <div
            className="glass-panel animate-slide-down"
            style={{
              padding: '12px 16px',
              backgroundColor: 'rgba(0, 230, 118, 0.95)',
              border: '1.5px solid var(--accent-green)',
              color: '#0A0E17',
              fontWeight: 800,
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}
          >
            <Sparkles size={20} color="#0A0E17" />
            <span>{arrivalNotification}</span>
          </div>
        )}

        {/* Open Place Suggestions Voting */}
        {openSuggestions.map((sug) => (
          <PlaceVotingBanner
            key={sug.id}
            suggestion={sug}
            currentUserId={user?.id || ''}
            totalMembers={members.length}
            onVote={(id, vote) => votePlace(id, vote)}
          />
        ))}
      </div>

      {/* SQUAD CONVOY COLLAPSIBLE POPUP WINDOW (MOBILE BOTTOM SHEET & DESKTOP FLOATING DRAWER) */}
      {squad && isSquadPanelOpen && (
        <>
          {/* Mobile Backdrop */}
          {isMobile && (
            <div
              className="animate-fade-in"
              onClick={() => setIsSquadPanelOpen(false)}
              style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0, 0, 0, 0.55)',
                backdropFilter: 'blur(3px)',
                WebkitBackdropFilter: 'blur(3px)',
                zIndex: 92
              }}
            />
          )}

          {/* Collapsible Popup / Drawer Panel */}
          <div
            className={`cockpit-card ${isMobile ? 'animate-slide-up' : 'animate-modal-in'}`}
            style={{
              position: isMobile ? 'fixed' : 'absolute',
              top: isMobile ? 'auto' : (isNavigating ? '120px' : '76px'),
              bottom: isMobile ? 'calc(68px + env(safe-area-inset-bottom, 0px))' : '24px',
              left: isMobile ? '8px' : '16px',
              right: isMobile ? '8px' : 'auto',
              width: isMobile ? 'auto' : '380px',
              maxWidth: isMobile ? 'none' : 'calc(100vw - 32px)',
              maxHeight: isMobile ? 'calc(85vh - 70px)' : 'none',
              zIndex: isMobile ? 93 : 50,
              backgroundColor: 'rgba(10, 15, 29, 0.98)',
              border: '1px solid var(--border-medium)',
              borderRadius: 'var(--radius-lg)',
              boxShadow: isMobile
                ? '0 -8px 32px rgba(0, 0, 0, 0.8), 0 0 20px rgba(0, 240, 255, 0.1)'
                : 'var(--shadow-xl)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden'
            }}
          >
            <SquadPanel
              squad={squad}
              members={enrichedMembers}
              squadProgress={squadProgress}
              currentUserId={user?.id || ''}
              isHost={isHost}
              isSharingPaused={location.isSharingPaused}
              onToggleSharing={location.togglePauseSharing}
              onLocateMember={handleLocateMember}
              onProposeRegroup={handleStartSelectingMeetingPoint}
              onOpenSettings={() => setIsHostSettingsOpen(true)}
              onOpenChat={() => setIsChatOpen(true)}
              hasUnreadMessages={messages.length > 0}
              onClose={() => setIsSquadPanelOpen(false)}
              onStartNavigation={handleStartNavigation}
              canStartNavigation={Boolean(!isNavigating && activeRoute)}
            />
          </div>
        </>
      )}

      {/* "LET'S MEET HERE" (GOOGLE MAPS STYLE SELECTION OVERLAYS) */}
      {isSelectingMeetingPoint && (
        <>
          {/* Top Instruction & Place Search Banner */}
          <div
            className="cockpit-card animate-slide-down"
            style={{
              position: 'absolute',
              top: '16px',
              left: '12px',
              right: '12px',
              maxWidth: '560px',
              margin: '0 auto',
              zIndex: 'var(--z-modal)',
              padding: '14px 16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
              backgroundColor: 'rgba(10, 15, 29, 0.96)',
              border: '1px solid rgba(245, 158, 11, 0.4)',
              boxShadow: 'var(--shadow-xl)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: 'rgba(245, 158, 11, 0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <MapPin size={18} color="var(--accent-amber)" />
                </div>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 800, color: '#FFFFFF', letterSpacing: '-0.01em' }}>
                    Set Meeting Point
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                    Search a spot or tap anywhere on the map
                  </div>
                </div>
              </div>
              <button
                className="btn-secondary"
                onClick={handleCancelMeetingPoint}
                style={{ padding: '6px 12px', fontSize: '12px', flexShrink: 0 }}
              >
                Cancel
              </button>
            </div>

            {/* Place Search with Category Filters (Food, Fuel, Hotel, Cafe) */}
            <div style={{ width: '100%' }}>
              <PlaceSearchBox
                userLocation={location.coordinates}
                onSelectPlace={(place) => {
                  setSelectedMeetingCoords(place.coordinates);
                  setSelectedMeetingName(place.name || place.address || 'Selected Location');
                  setMapCenterPoint(place.coordinates);
                  calculateMeetingPointPreviewRoute(place.coordinates);
                }}
                placeholder="Search McDonald's, petrol pump, hotel, temple..."
                showCategories={true}
                isSquadActive={false}
              />
            </div>
          </div>

          {/* Bottom Confirmation Card (When point is tapped) */}
          {selectedMeetingCoords && (
            <div
              className="cockpit-card animate-slide-up"
              style={{
                position: 'absolute',
                bottom: '24px',
                left: '12px',
                right: '12px',
                maxWidth: '440px',
                margin: '0 auto',
                zIndex: 'var(--z-modal)',
                padding: '16px 20px',
                backgroundColor: 'rgba(10, 15, 29, 0.96)',
                border: '1px solid rgba(245, 158, 11, 0.4)',
                boxShadow: 'var(--shadow-xl)',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                <div
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    backgroundColor: 'rgba(255, 179, 0, 0.15)',
                    border: '1.5px solid var(--accent-amber)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}
                >
                  <MapPin size={22} color="var(--accent-amber)" />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--accent-amber)', textTransform: 'uppercase' }}>
                    Regroup Location
                  </div>
                  <div style={{ fontSize: '15px', fontWeight: 800, color: '#FFFFFF', marginTop: '2px', wordBreak: 'break-word' }}>
                    {selectedMeetingName || 'Selected Location'}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                    {selectedMeetingCoords.lat.toFixed(5)}, {selectedMeetingCoords.lng.toFixed(5)}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
                <button
                  className="btn-secondary"
                  onClick={handleCancelMeetingPoint}
                  style={{ flex: 1, padding: '10px', fontSize: '13px' }}
                >
                  Cancel
                </button>
                <button
                  className="btn-secondary"
                  onClick={() => {
                    setSelectedMeetingCoords(null);
                    setSelectedMeetingName('');
                    setPreviewMeetingRoute(null);
                  }}
                  style={{ flex: 1, padding: '10px', fontSize: '13px' }}
                >
                  Reposition
                </button>
                <button
                  className="btn-primary"
                  onClick={handleConfirmMeetingPoint}
                  style={{
                    flex: 2,
                    padding: '10px',
                    fontSize: '13px',
                    background: 'linear-gradient(135deg, #FFB300, #FF8F00)',
                    color: '#0A0E17',
                    fontWeight: 800
                  }}
                >
                  Set Meeting Point
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Centered Compact Start Navigation Button */}
      {!isNavigating && activeRoute && (
        <div
          style={{
            position: isMobile ? 'fixed' : 'absolute',
            bottom: isMobile
              ? 'calc(68px + env(safe-area-inset-bottom, 0px))'
              : '24px',
            left: isMobile ? '16px' : 'auto',
            right: isMobile ? '16px' : '24px',
            maxWidth: isMobile ? '400px' : 'none',
            margin: isMobile ? '0 auto' : '0',
            zIndex: 85,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            pointerEvents: 'none'
          }}
        >
          <button
            onClick={handleStartNavigation}
            className="btn-primary"
            style={{
              pointerEvents: 'auto',
              width: isMobile ? '100%' : 'auto',
              height: '44px',
              padding: isMobile ? '0 20px' : '0 24px',
              fontSize: '13.5px',
              borderRadius: '999px',
              fontWeight: 800,
              boxShadow: '0 0 16px rgba(0, 240, 255, 0.35), 0 3px 12px rgba(0, 0, 0, 0.45)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              letterSpacing: '0.03em',
              background: 'linear-gradient(135deg, #00F0FF 0%, #0066FF 100%)',
              color: '#0A0E17',
              border: 'none',
              cursor: 'pointer',
              transition: 'transform 0.15s ease, box-shadow 0.15s ease'
            }}
          >
            <Navigation size={16} color="#0A0E17" strokeWidth={2.5} />
            <span>START NAVIGATION</span>
          </button>
        </div>
      )}

      {/* Convoy Simulator Toggle (Desktop testing only) */}
      {!isMobile && (
        <div
          style={{
            position: 'absolute',
            bottom: activeRoute && !isNavigating ? '78px' : '24px',
            right: '24px',
            zIndex: 85,
            pointerEvents: 'auto'
          }}
        >
          <button
            onClick={toggleConvoySimulator}
            className="btn-secondary"
            title="Toggle Convoy Simulation (For Desktop Testing)"
            style={{
              fontSize: '12px',
              padding: '7px 14px',
              borderRadius: 'var(--radius-full)',
              backgroundColor: isConvoyDemoActive ? 'rgba(0, 240, 255, 0.2)' : 'rgba(10, 15, 29, 0.92)',
              borderColor: isConvoyDemoActive ? 'var(--accent-cyan)' : 'var(--border-subtle)',
              color: isConvoyDemoActive ? 'var(--accent-cyan)' : 'var(--text-primary)',
              boxShadow: 'var(--shadow-md)'
            }}
          >
            {isConvoyDemoActive ? <Pause size={13} /> : <Play size={13} />}
            <span>{isConvoyDemoActive ? 'Stop Demo' : 'Demo Convoy'}</span>
          </button>
        </div>
      )}

      {/* CREATE SQUAD WIZARD MODAL (FLOW A: HOME PAGE FULL 5-STEP WIZARD) */}
      <CreateSquadWizard
        isOpen={isCreateSquadOpen}
        onClose={() => setIsCreateSquadOpen(false)}
        userLocation={location.coordinates}
        onCreateSquad={createSquad}
        onStartNavigation={handleStartNavigation}
      />

      {/* FLOW B — SHORT CREATE SQUAD MODAL (FROM MAP SEARCH ROUTE) */}
      {isShortCreateSquadOpen && selectedDestination && activeRoute && (
        <div
          className="modal-overlay"
          onClick={() => setIsShortCreateSquadOpen(false)}
        >
          <div
            className="cockpit-card animate-modal-in"
            style={{
              width: '100%',
              maxWidth: '460px',
              padding: '28px 24px',
              backgroundColor: 'var(--bg-elevated)',
              border: '1px solid var(--border-medium)',
              boxShadow: 'var(--shadow-elevated)',
              borderRadius: 'var(--radius-lg)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <div>
                <h3 style={{ fontSize: '20px', fontWeight: 800, color: '#FFFFFF', margin: 0 }}>Create Squad</h3>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  Trip to <strong style={{ color: 'var(--accent-cyan)' }}>{selectedDestination.name}</strong> • {Math.round(activeRoute.distance / 1000)} km
                </p>
              </div>
              <button
                className="btn-icon"
                onClick={() => setIsShortCreateSquadOpen(false)}
                style={{ width: '36px', height: '36px' }}
              >
                <X size={18} color="var(--text-muted)" />
              </button>
            </div>

            <form onSubmit={handleShortCreateSquadSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                  Host Name *
                </label>
                <input
                  type="text"
                  value={shortHostName}
                  onChange={(e) => {
                    setShortHostName(e.target.value);
                    if (shortSquadError) setShortSquadError(null);
                  }}
                  placeholder="Enter your name"
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: 'var(--bg-card)',
                    border: '1px solid var(--border-medium)',
                    color: '#FFFFFF',
                    fontSize: '14px',
                    fontWeight: 600,
                    outline: 'none'
                  }}
                  autoFocus
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                  Group / Squad Name *
                </label>
                <input
                  type="text"
                  value={shortGroupName}
                  onChange={(e) => {
                    setShortGroupName(e.target.value);
                    if (shortSquadError) setShortSquadError(null);
                  }}
                  placeholder="e.g. Goa Trip, Convoy Alpha"
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: 'var(--bg-card)',
                    border: '1px solid var(--border-medium)',
                    color: '#FFFFFF',
                    fontSize: '14px',
                    fontWeight: 600,
                    outline: 'none'
                  }}
                />
              </div>

              {shortSquadError && (
                <div style={{ fontSize: '12px', color: 'var(--accent-red)', fontWeight: 600 }}>
                  {shortSquadError}
                </div>
              )}

              <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
                <button
                  type="button"
                  onClick={() => setIsShortCreateSquadOpen(false)}
                  className="btn-secondary"
                  style={{ flex: 1, padding: '12px' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingShortSquad}
                  className="btn-primary"
                  style={{ flex: 2, padding: '12px', fontSize: '15px' }}
                >
                  {isSubmittingShortSquad ? 'Creating Squad...' : 'Create Squad'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SQUAD CHAT DRAWER */}
      <SquadChatDrawer
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        messages={messages}
        currentUserId={user?.id || ''}
        onSendMessage={sendChat}
      />

      {/* REGROUP ("LET'S MEET HERE") MODAL */}
      <RegroupModal
        isOpen={isRegroupOpen}
        onClose={() => setIsRegroupOpen(false)}
        activeRegroupPoint={activeRegroupPoint}
        totalMembers={members.length}
        currentUserId={user?.id || ''}
        userLocation={location.coordinates}
        onPropose={proposeRegroup}
        onVote={voteRegroup}
      />

      {/* HOST SETTINGS MODAL */}
      {squad && (
        <HostSettingsModal
          isOpen={isHostSettingsOpen}
          onClose={() => setIsHostSettingsOpen(false)}
          squad={squad}
          members={members}
          currentUserId={user?.id || ''}
          onRenameSquad={renameSquad}
          onRemoveMember={removeMember}
          onEndSquad={async () => {
            await endSquad();
            setIsHostSettingsOpen(false);
            setIsSquadPanelOpen(false);
            setActiveRoute(null);
            setIsNavigating(false);
            setSelectedDestination(null);
          }}
        />
      )}
    </div>
  );
};

const AppContent: React.FC = () => {
  const [currentView, setCurrentView] = useState<AppView>('home');
  const [targetSquadId, setTargetSquadId] = useState<string | null>(null);
  const [openCreateOnCockpit, setOpenCreateOnCockpit] = useState(false);
  const [autoStartNavOnCockpit, setAutoStartNavOnCockpit] = useState(false);
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [openSquadPanelTrigger, setOpenSquadPanelTrigger] = useState(0);

  const { squad } = useSquad();

  // Check URL on load for invite links (?join=SQ-1234, /join/SQ-1234, #join=SQ-1234)
  useEffect(() => {
    const detected = parseSquadId(window.location.href);
    if (detected) {
      setTargetSquadId(detected);
      setCurrentView('join');
    }
  }, []);

  const handleOpenMap = () => {
    setOpenCreateOnCockpit(false);
    setAutoStartNavOnCockpit(false);
    setCurrentView('map');
  };

  const handleCreateSquad = () => {
    setOpenCreateOnCockpit(true);
    setAutoStartNavOnCockpit(false);
    setCurrentView('map');
  };

  const handleJoinSquadId = (id: string) => {
    setTargetSquadId(id);
    setCurrentView('join');
  };

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
      {/* Persistent Global Header on Home & Join pages */}
      {currentView !== 'map' && (
        <GlobalHeader
          currentView={currentView}
          onNavigate={(view) => {
            if (view === 'map') handleOpenMap();
            else setCurrentView('home');
          }}
          onOpenAccount={() => setIsAccountModalOpen(true)}
        />
      )}

      {/* Main Content Area */}
      <main style={{ flex: 1, minHeight: 0, position: 'relative', display: 'flex', flexDirection: 'column' }}>
        {currentView === 'home' && (
          <HomePage
            onOpenMap={handleOpenMap}
            onStartNavigating={handleOpenMap}
            onCreateSquad={handleCreateSquad}
            onJoinSquad={handleJoinSquadId}
            onOpenAccount={() => setIsAccountModalOpen(true)}
          />
        )}

        {currentView === 'join' && targetSquadId && (
          <JoinSquadPage
            squadId={targetSquadId}
            onJoinSuccess={() => {
              setAutoStartNavOnCockpit(false);
              setCurrentView('map');
            }}
            onCancel={() => {
              setCurrentView('home');
            }}
            onRequestLocation={async () => {
              if ('geolocation' in navigator) {
                return new Promise((resolve) => {
                  navigator.geolocation.getCurrentPosition(
                    () => resolve(true),
                    () => resolve(false)
                  );
                });
              }
              return false;
            }}
          />
        )}

        {currentView === 'map' && (
          <NavigationCockpit
            onGoHome={() => setCurrentView('home')}
            openCreateSquadOnMount={openCreateOnCockpit}
            autoStartNavigationOnMount={autoStartNavOnCockpit}
            onOpenAccount={() => setIsAccountModalOpen(true)}
            openSquadPanelTrigger={openSquadPanelTrigger}
          />
        )}
      </main>

      {/* Touch-Friendly Bottom Navigation for Mobile */}
      <MobileBottomNav
        currentView={currentView}
        onNavigate={(view) => {
          if (view === 'map') handleOpenMap();
          else setCurrentView('home');
        }}
        onOpenAccount={() => setIsAccountModalOpen(true)}
        onOpenSquadAction={() => {
          if (squad) {
            handleOpenMap();
            setOpenSquadPanelTrigger((prev) => prev + 1);
          } else {
            handleCreateSquad();
          }
        }}
      />

      {/* User Account / Profile Modal */}
      <UserAccountModal
        isOpen={isAccountModalOpen}
        onClose={() => setIsAccountModalOpen(false)}
      />
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <SquadProvider userCoords={null}>
        <AppContent />
      </SquadProvider>
    </AuthProvider>
  );
}
