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
import { Route, LatLng } from './types/navigation';
import { SquadMember } from './types/squad';
import { squadDataService } from './services/squad/squadDataService';
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
  X
} from 'lucide-react';

type AppView = 'home' | 'join' | 'map';

const NavigationCockpit: React.FC<{
  onGoHome: () => void;
  openCreateSquadOnMount?: boolean;
  autoStartNavigationOnMount?: boolean;
}> = ({ onGoHome, openCreateSquadOnMount = false, autoStartNavigationOnMount = false }) => {
  const { user } = useAuth();
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
    endSquad
  } = useSquad();

  // Location Tracker
  const location = useLocationTracker();

  // Navigation State
  const [activeRoute, setActiveRoute] = useState<Route | null>(squad?.canonicalRoute || null);
  const [isNavigating, setIsNavigating] = useState(
    Boolean(autoStartNavigationOnMount && squad?.canonicalRoute)
  );
  const [selectedDestination, setSelectedDestination] = useState<Place | null>(null);

  // UI Drawers & Modals
  const [isCreateSquadOpen, setIsCreateSquadOpen] = useState(openCreateSquadOnMount);
  const [isSquadPanelOpen, setIsSquadPanelOpen] = useState(true);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isRegroupOpen, setIsRegroupOpen] = useState(false);
  const [isHostSettingsOpen, setIsHostSettingsOpen] = useState(false);
  const [isMobileSheetExpanded, setIsMobileSheetExpanded] = useState(false);

  // Demo / Convoy Simulator Mode
  const [isConvoyDemoActive, setIsConvoyDemoActive] = useState(false);
  const convoyIntervalRef = useRef<any>(null);

  // Sync active route with squad canonical route or recalculate from member position to destination
  useEffect(() => {
    if (squad?.canonicalRoute) {
      setIsSquadPanelOpen(true);
      if (autoStartNavigationOnMount) {
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
      // Squad ended or left: clean up navigation and modals
      setActiveRoute(null);
      setIsNavigating(false);
      setSelectedDestination(null);
      setIsHostSettingsOpen(false);
      setIsChatOpen(false);
      setIsRegroupOpen(false);
      if (isConvoyDemoActive) {
        clearInterval(convoyIntervalRef.current);
        setIsConvoyDemoActive(false);
      }
    }
  }, [squad?.canonicalRoute, squad?.squadId, location.coordinates, isHost, autoStartNavigationOnMount]);


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
  const handleSelectPlace = async (place: Place) => {
    setSelectedDestination(place);
    const origin: LatLng = location.coordinates || { lat: 17.385, lng: 78.4867 };
    const calculatedRoutes = await routingProvider.calculateRoutes(
      origin,
      place.coordinates,
      squad?.vehicleMode || 'car'
    );
    if (calculatedRoutes.length > 0) {
      setActiveRoute(calculatedRoutes[0]);
    }
  };

  // Start Navigation
  const handleStartNavigation = () => {
    if (!activeRoute) return;
    setIsNavigating(true);
    setIsSquadPanelOpen(false);
  };

  // Exit Navigation
  const handleExitNavigation = () => {
    setIsNavigating(false);
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
        focusedMemberId={focusedMemberId}
        onMemberClick={handleLocateMember}
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
        />
      )}

      {/* Top Search Bar & Header (When NOT Navigating) */}
      {!isNavigating && (
        <div
          style={{
            position: 'absolute',
            top: '16px',
            left: '16px',
            right: '16px',
            zIndex: 'var(--z-controls)',
            maxWidth: '560px',
            margin: '0 auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
          }}
        >
          {/* Top Bar with Home Button, Search, and Squad Indicator */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              className="btn-icon"
              onClick={onGoHome}
              title="Go to Home"
              style={{ flexShrink: 0, width: '46px', height: '46px' }}
            >
              <Home size={20} color="var(--accent-cyan)" />
            </button>

            <div style={{ flex: 1 }}>
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
                  width: '46px',
                  height: '46px',
                  position: 'relative'
                }}
              >
                <MessageSquare size={20} color="var(--accent-cyan)" />
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
          </div>

          {/* Active Route Summary Bar if route selected */}
          {activeRoute && !squad && (
            <div
              className="glass-panel animate-slide-down"
              style={{
                padding: '12px 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                backgroundColor: 'var(--bg-glass-card)'
              }}
            >
              <div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 700 }}>
                  SELECTED ROUTE
                </div>
                <div style={{ fontSize: '15px', fontWeight: 800, color: '#FFFFFF' }}>
                  {activeRoute.name}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  {Math.round(activeRoute.distance / 1000)} km • ~{Math.round(activeRoute.duration / 60)} min
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <button
                  onClick={() => setIsCreateSquadOpen(true)}
                  className="btn-secondary"
                  style={{ fontSize: '13px', padding: '8px 14px' }}
                >
                  <Users size={16} color="var(--accent-cyan)" />
                  <span>Create Squad</span>
                </button>
                <button
                  onClick={handleStartNavigation}
                  className="btn-primary"
                  style={{ fontSize: '13px', padding: '8px 16px' }}
                >
                  <Navigation size={16} />
                  <span>Start Nav</span>
                </button>
                <button
                  onClick={() => {
                    setActiveRoute(null);
                    setSelectedDestination(null);
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
          top: isNavigating ? '120px' : '110px',
          left: '16px',
          right: '16px',
          zIndex: 'var(--z-hud)',
          maxWidth: '520px',
          margin: '0 auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px'
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

      {/* DESKTOP SIDE PANEL: Squad & Inter-Member Distances (Desktop Only) */}
      {squad && (
        <div
          className="glass-panel"
          style={{
            position: 'absolute',
            top: '80px',
            bottom: '24px',
            left: '20px',
            width: '380px',
            zIndex: 'var(--z-controls)',
            backgroundColor: 'var(--bg-glass-card)',
            border: '1px solid var(--border-medium)',
            display: window.innerWidth > 768 && isSquadPanelOpen ? 'flex' : 'none',
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
            onProposeRegroup={() => setIsRegroupOpen(true)}
            onOpenSettings={() => setIsHostSettingsOpen(true)}
          />
        </div>
      )}

      {/* MOBILE BOTTOM SHEET: Squad Members & Distances (Mobile Only) */}
      {squad && window.innerWidth <= 768 && !isNavigating && (
        <div
          className="glass-panel"
          style={{
            position: 'absolute',
            left: '12px',
            right: '12px',
            bottom: '16px',
            zIndex: 'var(--z-bottom-sheet)',
            maxHeight: isMobileSheetExpanded ? '75vh' : '150px',
            transition: 'max-height 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            backgroundColor: 'var(--bg-secondary)',
            border: '1px solid var(--border-medium)'
          }}
        >
          {/* Drag / Expand Bar */}
          <div
            onClick={() => setIsMobileSheetExpanded((prev) => !prev)}
            style={{
              padding: '10px 16px',
              borderBottom: '1px solid var(--border-subtle)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Users size={18} color="var(--accent-cyan)" />
              <span style={{ fontSize: '14px', fontWeight: 800, color: '#FFFFFF' }}>
                Squad Convoy ({members.length})
              </span>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>•</span>
              <span className="font-mono text-green" style={{ fontSize: '12px', fontWeight: 700 }}>
                {squadProgress.enRouteCount} on track
              </span>
            </div>
            {isMobileSheetExpanded ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
          </div>

          <div style={{ flex: 1, overflowY: 'auto' }}>
            <SquadPanel
              squad={squad}
              members={enrichedMembers}
              squadProgress={squadProgress}
              currentUserId={user?.id || ''}
              isHost={isHost}
              isSharingPaused={location.isSharingPaused}
              onToggleSharing={location.togglePauseSharing}
              onLocateMember={handleLocateMember}
              onProposeRegroup={() => setIsRegroupOpen(true)}
              onOpenSettings={() => setIsHostSettingsOpen(true)}
            />
          </div>
        </div>
      )}

      {/* BOTTOM RIGHT FLOATING BUTTONS: Simulator Mode & Start Nav */}
      <div
        style={{
          position: 'absolute',
          bottom: '24px',
          right: '16px',
          zIndex: 'var(--z-controls)',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          alignItems: 'flex-end'
        }}
      >
        {/* Convoy Simulator Toggle */}
        <button
          onClick={toggleConvoySimulator}
          className="btn-secondary"
          title="Toggle Convoy Simulation (For Desktop Testing)"
          style={{
            fontSize: '12px',
            padding: '8px 14px',
            borderRadius: 'var(--radius-full)',
            backgroundColor: isConvoyDemoActive ? 'rgba(0, 240, 255, 0.2)' : 'var(--bg-glass)',
            borderColor: isConvoyDemoActive ? 'var(--accent-cyan)' : 'var(--border-subtle)',
            color: isConvoyDemoActive ? 'var(--accent-cyan)' : 'var(--text-primary)'
          }}
        >
          {isConvoyDemoActive ? <Pause size={14} /> : <Play size={14} />}
          <span>{isConvoyDemoActive ? 'Stop Simulator' : 'Demo Convoy'}</span>
        </button>

        {/* Start Nav Button (If route exists & not navigating) */}
        {!isNavigating && activeRoute && (
          <button
            onClick={handleStartNavigation}
            className="btn-primary pulse-radar-green"
            style={{
              padding: '14px 22px',
              fontSize: '16px',
              borderRadius: 'var(--radius-full)',
              background: 'linear-gradient(135deg, var(--accent-green), #00C853)',
              color: '#0A0E17',
              fontWeight: 800
            }}
          >
            <Navigation size={20} />
            <span>Start Navigation</span>
          </button>
        )}
      </div>

      {/* CREATE SQUAD WIZARD MODAL */}
      <CreateSquadWizard
        isOpen={isCreateSquadOpen}
        onClose={() => setIsCreateSquadOpen(false)}
        userLocation={location.coordinates}
        onCreateSquad={createSquad}
        onStartNavigation={handleStartNavigation}
      />

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

export default function App() {
  const [currentView, setCurrentView] = useState<AppView>('home');
  const [targetSquadId, setTargetSquadId] = useState<string | null>(null);
  const [openCreateOnCockpit, setOpenCreateOnCockpit] = useState(false);

  // Check URL on load for invite links (?join=SQ-1234, /join/SQ-1234, #join=SQ-1234)
  useEffect(() => {
    const detected = parseSquadId(window.location.href);
    if (detected) {
      setTargetSquadId(detected);
      setCurrentView('join');
    }
  }, []);

  const [autoStartNavOnCockpit, setAutoStartNavOnCockpit] = useState(false);

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
    <AuthProvider>
      <SquadProvider userCoords={null}>
        <div style={{ width: '100%', height: '100%', position: 'relative' }}>
          {currentView === 'home' && (
            <HomePage
              onOpenMap={handleOpenMap}
              onStartNavigating={handleOpenMap}
              onCreateSquad={handleCreateSquad}
              onJoinSquad={handleJoinSquadId}
            />
          )}

          {currentView === 'join' && targetSquadId && (
            <JoinSquadPage
              squadId={targetSquadId}
              onJoinSuccess={() => {
                setAutoStartNavOnCockpit(true);
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
            />
          )}
        </div>
      </SquadProvider>
    </AuthProvider>
  );
}
