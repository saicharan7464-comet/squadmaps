import React, { useState } from 'react';
import { RouteStep } from '../../types/navigation';
import { formatDistance } from '../../utils/format';
import {
  CornerUpLeft,
  CornerUpRight,
  ArrowUp,
  ArrowUpRight,
  ArrowUpLeft,
  RotateCcw,
  Volume2,
  VolumeX,
  X,
  AlertTriangle,
  Search,
  GitFork,
  Navigation,
  Sparkles,
  Car,
  ShieldAlert,
  Cone,
  Clock,
  Check
} from 'lucide-react';

interface TurnByTurnHUDProps {
  currentStep: RouteStep | null;
  nextStep: RouteStep | null;
  distanceToNextStep: number;
  distanceRemaining: number;
  durationRemaining: number;
  etaString: string;
  currentSpeed: number;
  isOffRoute: boolean;
  voiceMuted: boolean;
  onToggleVoice: () => void;
  onExitNavigation: () => void;
  onRecenter?: () => void;
  isAutoCentered?: boolean;
  onToggleOverview?: () => void;
  onResetNorth?: () => void;
  onSearchAlongRoute?: (category?: string) => void;
}

export const TurnByTurnHUD: React.FC<TurnByTurnHUDProps> = ({
  currentStep,
  nextStep,
  distanceToNextStep,
  distanceRemaining,
  durationRemaining,
  etaString,
  currentSpeed,
  isOffRoute,
  voiceMuted,
  onToggleVoice,
  onExitNavigation,
  onRecenter,
  isAutoCentered = true,
  onToggleOverview,
  onResetNorth,
  onSearchAlongRoute
}) => {
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportToast, setReportToast] = useState<string | null>(null);
  const [isSearchAlongOpen, setIsSearchAlongOpen] = useState(false);

  // Format Duration like Google Maps (e.g. "13 hr 43 min" or "24 min")
  const formatGoogleEta = (seconds: number) => {
    if (!seconds || seconds <= 0) return '1 min';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.round((seconds % 3600) / 60);

    if (hours > 0) {
      return `${hours} hr ${minutes} min`;
    }
    return `${Math.max(1, minutes)} min`;
  };

  // Maneuver Icon Helper with crisp pure white Google Maps icons
  const renderManeuverIcon = (step: RouteStep | null, size = 42) => {
    if (!step) return <ArrowUp size={size} color="#FFFFFF" strokeWidth={3} />;

    const type = step.maneuver.type?.toLowerCase() || '';
    const modifier = step.maneuver.modifier?.toLowerCase() || '';

    if (modifier.includes('slight right')) {
      return <ArrowUpRight size={size} color="#FFFFFF" strokeWidth={3} />;
    }
    if (modifier.includes('slight left')) {
      return <ArrowUpLeft size={size} color="#FFFFFF" strokeWidth={3} />;
    }
    if (modifier.includes('left')) {
      return <CornerUpLeft size={size} color="#FFFFFF" strokeWidth={3} />;
    }
    if (modifier.includes('right')) {
      return <CornerUpRight size={size} color="#FFFFFF" strokeWidth={3} />;
    }
    if (type.includes('roundabout') || modifier.includes('u-turn')) {
      return <RotateCcw size={size} color="#FFFFFF" strokeWidth={3} />;
    }
    return <ArrowUp size={size} color="#FFFFFF" strokeWidth={3} />;
  };

  const handleReport = (type: string) => {
    setIsReportModalOpen(false);
    setReportToast(`Reported: ${type}. Squad alerted.`);
    setTimeout(() => {
      setReportToast(null);
    }, 3500);
  };

  return (
    <>
      {/* 1. TOP: Emerald Green Turn-By-Turn Banner (Picture 2 Exact Match) */}
      <div
        style={{
          position: 'absolute',
          top: '12px',
          left: '12px',
          right: '12px',
          zIndex: 'var(--z-hud)',
          maxWidth: '560px',
          margin: '0 auto'
        }}
      >
        <div className="google-nav-top-card animate-slide-down">
          {/* Main Step Instruction */}
          <div
            style={{
              padding: '16px 18px 12px 18px',
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              background: isOffRoute ? '#991B1B' : '#005F56'
            }}
          >
            {/* Maneuver Arrow */}
            <div
              style={{
                width: '54px',
                height: '54px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}
            >
              {isOffRoute ? (
                <AlertTriangle size={38} color="#FFFFFF" strokeWidth={2.5} />
              ) : (
                renderManeuverIcon(currentStep, 40)
              )}
            </div>

            {/* Instruction Details */}
            <div style={{ flex: 1, minWidth: 0 }}>
              {isOffRoute ? (
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#FEE2E2' }}>
                    Off Route
                  </div>
                  <div style={{ fontSize: '18px', fontWeight: 800, color: '#FFFFFF' }}>
                    Recalculating route...
                  </div>
                </div>
              ) : (
                <div>
                  {distanceToNextStep > 0 && (
                    <div
                      style={{
                        fontSize: '13px',
                        fontWeight: 700,
                        color: 'rgba(255, 255, 255, 0.85)',
                        letterSpacing: '0.3px',
                        textTransform: 'uppercase',
                        marginBottom: '2px'
                      }}
                    >
                      In {formatDistance(distanceToNextStep)}
                    </div>
                  )}
                  <div
                    style={{
                      fontSize: '22px',
                      fontWeight: 800,
                      lineHeight: 1.2,
                      color: '#FFFFFF',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {currentStep?.instruction || 'Head south'}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Secondary Maneuver Badge ("Then ↱") */}
          {!isOffRoute && (
            <div style={{ display: 'flex' }}>
              <div className="google-nav-then-badge">
                <span>Then</span>
                {renderManeuverIcon(nextStep, 16)}
                <span
                  style={{
                    maxWidth: '220px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {nextStep?.instruction || 'Outer Ring Rd (Toll road)'}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 2. RIGHT-SIDE FLOATING CONTROLS (Vertical Stack from Picture 2) */}
      <div
        style={{
          position: 'absolute',
          right: '16px',
          top: '160px',
          zIndex: 'var(--z-hud)',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          alignItems: 'center'
        }}
      >
        {/* Compass / North Button */}
        <button
          className="google-nav-btn-circle"
          onClick={onResetNorth}
          title="Align to North"
        >
          <div
            style={{
              position: 'relative',
              width: '26px',
              height: '26px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            {/* Red North arrow point */}
            <div
              style={{
                width: 0,
                height: 0,
                borderLeft: '5px solid transparent',
                borderRight: '5px solid transparent',
                borderBottom: '11px solid #EA4335'
              }}
            />
            {/* White needle bottom */}
            <div
              style={{
                width: 0,
                height: 0,
                borderLeft: '5px solid transparent',
                borderRight: '5px solid transparent',
                borderTop: '11px solid #E2E8F0'
              }}
            />
            <span
              style={{
                position: 'absolute',
                top: '-4px',
                fontSize: '9px',
                fontWeight: 900,
                color: '#FFFFFF'
              }}
            >
              N
            </span>
          </div>
        </button>

        {/* Search Along Route */}
        <button
          className="google-nav-btn-circle"
          onClick={() => setIsSearchAlongOpen((prev) => !prev)}
          title="Search along route"
        >
          <Search size={22} color="#FFFFFF" />
        </button>

        {/* Sound / Voice Guidance Toggle */}
        <button
          className="google-nav-btn-circle"
          onClick={onToggleVoice}
          title={voiceMuted ? 'Unmute voice' : 'Mute voice'}
        >
          {voiceMuted ? (
            <VolumeX size={22} color="#EA4335" />
          ) : (
            <Volume2 size={22} color="#FFFFFF" />
          )}
        </button>

        {/* Alternative Routes / Overview */}
        <button
          className="google-nav-btn-circle"
          onClick={onToggleOverview}
          title="Route Overview / Alternatives"
        >
          <GitFork size={22} color="#FFFFFF" />
        </button>
      </div>

      {/* Search Along Route Quick Menu (when Search clicked) */}
      {isSearchAlongOpen && (
        <div
          className="glass-panel animate-slide-down"
          style={{
            position: 'absolute',
            right: '72px',
            top: '215px',
            zIndex: 'var(--z-hud)',
            padding: '8px',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
            backgroundColor: '#111418',
            border: '1px solid rgba(255,255,255,0.2)'
          }}
        >
          {['Gas / Fuel', 'Restaurants', 'EV Charging', 'Coffee', 'Rest Stop'].map((cat) => (
            <button
              key={cat}
              onClick={() => {
                setIsSearchAlongOpen(false);
                if (onSearchAlongRoute) onSearchAlongRoute(cat);
              }}
              style={{
                padding: '8px 14px',
                borderRadius: '8px',
                color: '#FFFFFF',
                fontSize: '13px',
                fontWeight: 600,
                justifyContent: 'flex-start',
                background: 'transparent'
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.1)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              <span>{cat}</span>
            </button>
          ))}
        </div>
      )}

      {/* Floating Speedometer (Left Side) */}
      <div
        style={{
          position: 'absolute',
          left: '16px',
          bottom: '150px',
          zIndex: 'var(--z-hud)'
        }}
      >
        <div
          style={{
            padding: '10px 14px',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            minWidth: '68px',
            borderRadius: '12px',
            background: '#111418',
            border: `1.5px solid ${currentSpeed > 80 ? '#FFB300' : 'rgba(255, 255, 255, 0.2)'}`,
            boxShadow: '0 4px 14px rgba(0,0,0,0.5)'
          }}
        >
          <span
            className="font-mono"
            style={{
              fontSize: '24px',
              fontWeight: 800,
              color: currentSpeed > 80 ? '#FFB300' : '#FFFFFF',
              lineHeight: 1
            }}
          >
            {Math.round(currentSpeed)}
          </span>
          <span style={{ fontSize: '9px', color: '#94A3B8', fontWeight: 800, marginTop: '2px' }}>
            KM/H
          </span>
        </div>
      </div>

      {/* 3. FLOATING ACTION PILLS: "Re-centre" & "Report" (Picture 2 Exact Match) */}
      <div
        style={{
          position: 'absolute',
          bottom: '96px',
          left: '16px',
          right: '16px',
          zIndex: 'var(--z-hud)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          pointerEvents: 'none'
        }}
      >
        {/* "Re-centre" Button (Bottom Left Pill) */}
        <div style={{ pointerEvents: 'auto' }}>
          <button
            className="google-nav-pill-btn"
            onClick={onRecenter}
            title="Re-centre to your location"
            style={{
              borderColor: isAutoCentered ? 'rgba(255,255,255,0.22)' : 'var(--accent-cyan)',
              boxShadow: isAutoCentered ? undefined : '0 0 16px rgba(0,240,255,0.4)'
            }}
          >
            <Navigation size={17} color="#FFFFFF" style={{ transform: 'rotate(-45deg)' }} />
            <span>Re-centre</span>
          </button>
        </div>

        {/* "Report" Button (Bottom Right Pill) */}
        <div style={{ pointerEvents: 'auto' }}>
          <button
            className="google-nav-pill-btn"
            onClick={() => setIsReportModalOpen(true)}
            title="Report incident"
          >
            <div
              style={{
                width: '20px',
                height: '20px',
                borderRadius: '4px',
                background: '#FFB300',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <AlertTriangle size={13} color="#111418" fill="#111418" />
            </div>
            <span>Report</span>
          </button>
        </div>
      </div>

      {/* 4. BOTTOM NAVIGATION HUD (Picture 2 Exact Match) */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 'var(--z-hud)'
        }}
      >
        <div className="google-nav-bottom-hud animate-slide-up">
          {/* Top Drag Handle Pill */}
          <div
            style={{
              width: '38px',
              height: '4px',
              borderRadius: '999px',
              backgroundColor: 'rgba(255, 255, 255, 0.3)',
              margin: '0 auto 12px auto'
            }}
          />

          {/* Controls & Metrics Row */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px'
            }}
          >
            {/* Close / Exit Button (Circular button with white X) */}
            <button
              onClick={onExitNavigation}
              className="google-nav-btn-circle"
              title="Exit Navigation"
              style={{
                width: '52px',
                height: '52px',
                background: '#1A1E24',
                borderColor: 'rgba(255, 255, 255, 0.25)'
              }}
            >
              <X size={26} color="#FFFFFF" strokeWidth={2.5} />
            </button>

            {/* ETA & Distance Metrics (Center) */}
            <div
              style={{
                flex: 1,
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center'
              }}
            >
              {/* Large Bright Green Remaining Time */}
              <div
                style={{
                  fontSize: '26px',
                  fontWeight: 800,
                  color: '#22C55E',
                  letterSpacing: '-0.3px',
                  lineHeight: 1.1
                }}
              >
                {formatGoogleEta(durationRemaining)}
              </div>

              {/* Subtitle: Distance • Estimated Arrival Time */}
              <div
                style={{
                  fontSize: '14px',
                  fontWeight: 600,
                  color: '#CBD5E1',
                  marginTop: '3px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <span>{formatDistance(distanceRemaining)}</span>
                <span style={{ color: 'rgba(255,255,255,0.4)' }}>•</span>
                <span>{etaString || '10:49 am'}</span>
              </div>
            </div>

            {/* Gemini / Sparkle Assistant Button (Right Circle) */}
            <button
              className="google-nav-btn-circle"
              title="Trip Assistant"
              onClick={() => {
                setReportToast('AI Convoy Copilot active: Route clear.');
                setTimeout(() => setReportToast(null), 3000);
              }}
              style={{
                width: '52px',
                height: '52px',
                background: '#1A1E24',
                borderColor: 'rgba(66, 133, 244, 0.4)'
              }}
            >
              <Sparkles size={24} color="#4285F4" fill="#4285F4" />
            </button>
          </div>
        </div>
      </div>

      {/* Incident Report Modal (When "Report" pill is tapped) */}
      {isReportModalOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(4px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center'
          }}
          onClick={() => setIsReportModalOpen(false)}
        >
          <div
            className="animate-slide-up"
            style={{
              width: '100%',
              maxWidth: '500px',
              backgroundColor: '#111418',
              borderTop: '1px solid rgba(255,255,255,0.15)',
              borderRadius: '24px 24px 0 0',
              padding: '20px',
              boxShadow: '0 -10px 40px rgba(0,0,0,0.8)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ fontSize: '18px', fontWeight: 800, color: '#FFFFFF' }}>
                Report an Incident
              </div>
              <button
                onClick={() => setIsReportModalOpen(false)}
                style={{ background: 'transparent', color: '#94A3B8' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
              {[
                { label: 'Crash', icon: Car, color: '#EF4444' },
                { label: 'Speed Trap', icon: ShieldAlert, color: '#3B82F6' },
                { label: 'Slowdown', icon: Clock, color: '#F59E0B' },
                { label: 'Roadwork', icon: Cone, color: '#F97316' },
                { label: 'Hazard', icon: AlertTriangle, color: '#EAB308' },
                { label: 'Lane Closed', icon: AlertTriangle, color: '#EC4899' }
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.label}
                    onClick={() => handleReport(item.label)}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '16px 8px',
                      borderRadius: '16px',
                      backgroundColor: '#1C222B',
                      border: '1px solid rgba(255,255,255,0.08)',
                      color: '#FFFFFF'
                    }}
                  >
                    <div
                      style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '50%',
                        backgroundColor: `${item.color}22`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      <Icon size={22} color={item.color} />
                    </div>
                    <span style={{ fontSize: '12px', fontWeight: 700 }}>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification Banner */}
      {reportToast && (
        <div
          className="animate-slide-down"
          style={{
            position: 'absolute',
            top: '110px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 9999,
            backgroundColor: '#1E293B',
            color: '#FFFFFF',
            padding: '10px 18px',
            borderRadius: '999px',
            border: '1px solid #38BDF8',
            fontSize: '13px',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.6)'
          }}
        >
          <Check size={16} color="#38BDF8" />
          <span>{reportToast}</span>
        </div>
      )}
    </>
  );
};
