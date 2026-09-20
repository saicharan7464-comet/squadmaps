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
  Compass
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
  onExitNavigation
}) => {
  // Maneuver Icon Helper
  const renderManeuverIcon = (step: RouteStep | null) => {
    if (!step) return <ArrowUp size={36} color="var(--accent-cyan)" />;

    const type = step.maneuver.type?.toLowerCase() || '';
    const modifier = step.maneuver.modifier?.toLowerCase() || '';

    if (modifier.includes('left')) {
      return <CornerUpLeft size={36} color="var(--accent-cyan)" className="animate-bounce-turn" />;
    }
    if (modifier.includes('right')) {
      return <CornerUpRight size={36} color="var(--accent-cyan)" className="animate-bounce-turn" />;
    }
    if (type.includes('roundabout') || modifier.includes('u-turn')) {
      return <RotateCcw size={36} color="var(--accent-cyan)" />;
    }
    return <ArrowUp size={36} color="var(--accent-cyan)" />;
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
          margin: '0 auto'
        }}
      >
        <div
          className="glass-panel animate-slide-down"
          style={{
            padding: '16px 20px',
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            backgroundColor: isOffRoute ? 'rgba(255, 61, 113, 0.95)' : 'var(--bg-glass-card)',
            borderColor: isOffRoute ? 'var(--accent-red)' : 'var(--accent-cyan)'
          }}
        >
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: 'var(--radius-sm)',
              background: 'rgba(0, 240, 255, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}
          >
            {isOffRoute ? (
              <AlertTriangle size={36} color="#FFFFFF" className="animate-bounce-turn" />
            ) : (
              renderManeuverIcon(currentStep)
            )}
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            {isOffRoute ? (
              <div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#FFEBEF' }}>
                  Off Route Detected
                </div>
                <div style={{ fontSize: '17px', fontWeight: 800, color: '#FFFFFF' }}>
                  Recalculating route...
                </div>
              </div>
            ) : (
              <div>
                <div
                  className="font-mono text-cyan"
                  style={{ fontSize: '14px', fontWeight: 700, letterSpacing: '0.5px' }}
                >
                  In {formatDistance(distanceToNextStep)}
                </div>
                <div
                  style={{
                    fontSize: '18px',
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
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                    Then: {nextStep.instruction}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Voice Guidance Toggle */}
          <button
            className="btn-icon"
            onClick={onToggleVoice}
            title={voiceMuted ? 'Unmute voice navigation' : 'Mute voice navigation'}
            style={{ width: '42px', height: '42px', flexShrink: 0 }}
          >
            {voiceMuted ? <VolumeX size={20} color="var(--accent-red)" /> : <Volume2 size={20} color="var(--accent-cyan)" />}
          </button>
        </div>
      </div>

      {/* FLOATING SPEEDOMETER (Left Side) */}
      <div
        style={{
          position: 'absolute',
          left: '16px',
          bottom: '120px',
          zIndex: 'var(--z-hud)'
        }}
      >
        <div
          className="glass-panel"
          style={{
            padding: '10px 14px',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            minWidth: '70px',
            borderColor: currentSpeed > 80 ? 'var(--accent-amber)' : 'var(--border-subtle)'
          }}
        >
          <span
            className="font-mono"
            style={{
              fontSize: '26px',
              fontWeight: 800,
              color: currentSpeed > 80 ? 'var(--accent-amber)' : 'var(--text-primary)',
              lineHeight: 1
            }}
          >
            {Math.round(currentSpeed)}
          </span>
          <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 700, marginTop: '2px' }}>
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
          margin: '0 auto'
        }}
      >
        <div
          className="glass-panel animate-slide-up"
          style={{
            padding: '16px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px'
          }}
        >
          {/* ETA & Metrics */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div>
              <div
                className="font-mono text-green"
                style={{ fontSize: '24px', fontWeight: 800, lineHeight: 1 }}
              >
                {formatDuration(durationRemaining)}
              </div>
              <div style={{ display: 'flex', gap: '8px', marginTop: '4px', fontSize: '13px' }}>
                <span className="font-mono" style={{ color: 'var(--text-secondary)' }}>
                  {formatDistance(distanceRemaining)}
                </span>
                <span style={{ color: 'var(--border-medium)' }}>•</span>
                <span className="font-mono" style={{ color: 'var(--accent-cyan)' }}>
                  {etaString || 'Calculating...'}
                </span>
              </div>
            </div>
          </div>

          {/* Exit Navigation Button */}
          <button
            onClick={onExitNavigation}
            className="btn-secondary"
            style={{
              borderRadius: 'var(--radius-full)',
              padding: '10px 18px',
              backgroundColor: 'rgba(255, 61, 113, 0.15)',
              borderColor: 'var(--accent-red)',
              color: 'var(--accent-red)'
            }}
          >
            <X size={18} />
            <span style={{ fontWeight: 700 }}>Exit</span>
          </button>
        </div>
      </div>
    </>
  );
};
