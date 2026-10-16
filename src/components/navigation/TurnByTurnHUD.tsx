import React from 'react';
import { RouteStep } from '../../types/navigation';
import { formatDistance, formatDuration, formatSpeed } from '../../utils/format';
import {
  CornerUpLeft,
  CornerUpRight,
  ArrowUp,
  RotateCcw,
  Volume2,
  VolumeX,
  X,
  AlertTriangle,
  Compass,
  Users,
  MessageSquare,
  Gauge
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
  squadMemberCount?: number;
  onToggleSquad?: () => void;
  isSquadOpen?: boolean;
  onToggleChat?: () => void;
  isChatOpen?: boolean;
  hasUnreadMessages?: boolean;
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
  squadMemberCount,
  onToggleSquad,
  isSquadOpen = false,
  onToggleChat,
  isChatOpen = false,
  hasUnreadMessages = false
}) => {
  // Maneuver Icon Helper
  const renderManeuverIcon = (step: RouteStep | null) => {
    if (!step) return <ArrowUp size={34} color="var(--accent-cyan)" />;

    const type = step.maneuver.type?.toLowerCase() || '';
    const modifier = step.maneuver.modifier?.toLowerCase() || '';

    if (modifier.includes('left')) {
      return <CornerUpLeft size={34} color="var(--accent-cyan)" className="animate-bounce-turn" />;
    }
    if (modifier.includes('right')) {
      return <CornerUpRight size={34} color="var(--accent-cyan)" className="animate-bounce-turn" />;
    }
    if (type.includes('roundabout') || modifier.includes('u-turn')) {
      return <RotateCcw size={34} color="var(--accent-cyan)" />;
    }
    return <ArrowUp size={34} color="var(--accent-cyan)" />;
  };

  return (
    <>
      {/* TOP: Turn-by-Turn Instruction Banner */}
      <div
        style={{
          position: 'absolute',
          top: '16px',
          left: '16px',
          right: '16px',
          zIndex: 'var(--z-hud)',
          maxWidth: '560px',
          margin: '0 auto',
          pointerEvents: 'auto'
        }}
      >
        <div
          className="cockpit-card animate-slide-down"
          style={{
            padding: '14px 18px',
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            backgroundColor: isOffRoute ? 'rgba(239, 68, 68, 0.95)' : 'rgba(10, 15, 29, 0.94)',
            borderColor: isOffRoute ? 'var(--status-alert)' : 'rgba(0, 102, 255, 0.45)',
            boxShadow: 'var(--shadow-elevated)'
          }}
        >
          <div
            style={{
              width: '52px',
              height: '52px',
              borderRadius: 'var(--radius-sm)',
              background: isOffRoute ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 102, 255, 0.14)',
              border: `1px solid ${isOffRoute ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 210, 255, 0.3)'}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}
          >
            {isOffRoute ? (
              <AlertTriangle size={32} color="#FFFFFF" className="animate-bounce-turn" />
            ) : (
              renderManeuverIcon(currentStep)
            )}
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            {isOffRoute ? (
              <div>
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#FFEBEF', letterSpacing: '0.4px', textTransform: 'uppercase' }}>
                  Off Route Detected
                </div>
                <div style={{ fontSize: '16px', fontWeight: 800, color: '#FFFFFF' }}>
                  Recalculating optimal path...
                </div>
              </div>
            ) : (
              <div>
                <div
                  className="font-mono text-cyan"
                  style={{ fontSize: '13px', fontWeight: 800, letterSpacing: '0.5px' }}
                >
                  IN {formatDistance(distanceToNextStep)}
                </div>
                <div
                  style={{
                    fontSize: '17px',
                    fontWeight: 800,
                    lineHeight: 1.25,
                    color: '#FFFFFF',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {currentStep?.instruction || 'Continue on route'}
                </div>
                {nextStep && (
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    Then: {nextStep.instruction}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Top Controls: Chat & Voice Guidance */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
            {onToggleChat && (
              <button
                className="btn-icon"
                onClick={onToggleChat}
                title="Squad Chat Radio"
                style={{
                  width: '40px',
                  height: '40px',
                  position: 'relative',
                  backgroundColor: isChatOpen ? 'var(--accent-primary-dim)' : 'var(--bg-surface)',
                  borderColor: isChatOpen ? 'var(--accent-primary)' : 'var(--border-subtle)'
                }}
              >
                <MessageSquare size={18} color="var(--accent-cyan)" />
                {hasUnreadMessages && (
                  <span
                    style={{
                      position: 'absolute',
                      top: '6px',
                      right: '6px',
                      width: '7px',
                      height: '7px',
                      borderRadius: '50%',
                      backgroundColor: 'var(--status-live)',
                      boxShadow: '0 0 6px var(--status-live)'
                    }}
                  />
                )}
              </button>
            )}

            {/* Voice Guidance Toggle */}
            <button
              className="btn-icon"
              onClick={onToggleVoice}
              title={voiceMuted ? 'Unmute voice navigation' : 'Mute voice navigation'}
              style={{ width: '40px', height: '40px', flexShrink: 0 }}
            >
              {voiceMuted ? <VolumeX size={18} color="var(--status-alert)" /> : <Volume2 size={18} color="var(--accent-cyan)" />}
            </button>
          </div>
        </div>
      </div>

      {/* FLOATING SPEEDOMETER (Left Side) */}
      <div
        style={{
          position: 'absolute',
          left: '16px',
          bottom: '100px',
          zIndex: 'var(--z-hud)',
          pointerEvents: 'auto'
        }}
      >
        <div
          className="cockpit-card"
          style={{
            padding: '10px 14px',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            minWidth: '68px',
            backgroundColor: 'rgba(10, 15, 29, 0.94)',
            borderColor: currentSpeed > 80 ? 'var(--status-warning)' : 'var(--border-subtle)',
            boxShadow: 'var(--shadow-md)'
          }}
        >
          <span
            className="font-mono"
            style={{
              fontSize: '28px',
              fontWeight: 800,
              color: currentSpeed > 80 ? 'var(--status-warning)' : '#FFFFFF',
              lineHeight: 1
            }}
          >
            {Math.round(currentSpeed)}
          </span>
          <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 800, marginTop: '3px', letterSpacing: '0.4px' }}>
            KM/H
          </span>
        </div>
      </div>

      {/* BOTTOM: ETA | Distance | Time Navigation Bar */}
      <div
        style={{
          position: 'absolute',
          bottom: '16px',
          left: '16px',
          right: '16px',
          zIndex: 'var(--z-hud)',
          maxWidth: '560px',
          margin: '0 auto',
          pointerEvents: 'auto'
        }}
      >
        <div
          className="cockpit-card animate-slide-up"
          style={{
            padding: '14px 18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            backgroundColor: 'rgba(10, 15, 29, 0.94)',
            boxShadow: 'var(--shadow-elevated)'
          }}
        >
          {/* ETA & Metrics */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div>
              <div
                className="font-mono text-green"
                style={{ fontSize: '22px', fontWeight: 800, lineHeight: 1 }}
              >
                {formatDuration(durationRemaining)}
              </div>
              <div style={{ display: 'flex', gap: '8px', marginTop: '4px', fontSize: '12px' }}>
                <span className="font-mono" style={{ color: 'var(--text-secondary)' }}>
                  {formatDistance(distanceRemaining)}
                </span>
                <span style={{ color: 'var(--border-medium)' }}>•</span>
                <span className="font-mono text-cyan" style={{ fontWeight: 700 }}>
                  ETA {etaString || '--:--'}
                </span>
              </div>
            </div>
          </div>

          {/* Right Action Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {onToggleSquad && (
              <button
                type="button"
                onClick={onToggleSquad}
                className="btn-secondary"
                title="View squad members and details"
                aria-label="View squad members"
                style={{
                  borderRadius: 'var(--radius-full)',
                  padding: '8px 12px',
                  backgroundColor: isSquadOpen ? 'var(--accent-primary-dim)' : 'var(--bg-surface)',
                  borderColor: isSquadOpen ? 'var(--accent-primary)' : 'var(--border-medium)',
                  color: isSquadOpen ? 'var(--accent-cyan)' : 'var(--text-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <Users size={15} color="var(--accent-cyan)" />
                <span style={{ fontWeight: 700, fontSize: '12px' }}>
                  Squad {squadMemberCount !== undefined ? `(${squadMemberCount})` : ''}
                </span>
              </button>
            )}

            {onToggleChat && (
              <button
                type="button"
                onClick={onToggleChat}
                className="btn-secondary"
                title="Open Squad Chat Radio"
                aria-label="Open squad chat"
                style={{
                  borderRadius: 'var(--radius-full)',
                  padding: '8px 12px',
                  backgroundColor: isChatOpen ? 'var(--accent-primary-dim)' : 'var(--bg-surface)',
                  borderColor: isChatOpen ? 'var(--accent-primary)' : 'var(--border-medium)',
                  color: isChatOpen ? 'var(--accent-cyan)' : 'var(--text-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  position: 'relative'
                }}
              >
                <MessageSquare size={15} color="var(--accent-cyan)" />
                <span style={{ fontWeight: 700, fontSize: '12px' }}>Radio</span>
                {hasUnreadMessages && (
                  <span
                    style={{
                      position: 'absolute',
                      top: '5px',
                      right: '5px',
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      backgroundColor: 'var(--status-live)'
                    }}
                  />
                )}
              </button>
            )}

            {/* Exit Navigation Button */}
            <button
              type="button"
              onClick={onExitNavigation}
              className="btn-danger"
              aria-label="Exit navigation"
              style={{
                borderRadius: 'var(--radius-full)',
                padding: '8px 14px',
                display: 'flex',
                alignItems: 'center',
                gap: '5px'
              }}
            >
              <X size={15} />
              <span style={{ fontWeight: 700, fontSize: '12px' }}>Exit</span>
            </button>
          </div>
        </div>
      </div>
    </>
  );
};
