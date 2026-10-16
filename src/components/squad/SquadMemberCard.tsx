import React from 'react';
import { SquadMember } from '../../types/squad';
import { formatDistance, formatSpeed, formatLastSeen } from '../../utils/format';
import { Locate, CheckCircle, AlertCircle, WifiOff, PauseCircle, ArrowUp, ArrowDown } from 'lucide-react';

interface SquadMemberCardProps {
  member: SquadMember;
  isCurrentUser: boolean;
  onLocate: (member: SquadMember) => void;
}

export const SquadMemberCard: React.FC<SquadMemberCardProps> = ({
  member,
  isCurrentUser,
  onLocate
}) => {
  const isOffline = !member.online || member.status === 'offline';
  const isArrived = member.status === 'arrived';
  const isBehind = member.status === 'behind';
  const isPaused = member.locationSharingPaused;

  const renderStatusBadge = () => {
    if (isArrived) {
      return (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            fontSize: '10px',
            fontWeight: 800,
            color: 'var(--status-arrived)',
            background: 'var(--status-arrived-dim)',
            padding: '2px 7px',
            borderRadius: '999px',
            border: '1px solid rgba(139, 92, 246, 0.3)'
          }}
        >
          <CheckCircle size={11} /> Arrived
        </span>
      );
    }
    if (isPaused) {
      return (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            fontSize: '10px',
            fontWeight: 800,
            color: 'var(--status-warning)',
            background: 'var(--status-warning-dim)',
            padding: '2px 7px',
            borderRadius: '999px',
            border: '1px solid rgba(245, 158, 11, 0.3)'
          }}
        >
          <PauseCircle size={11} /> Paused
        </span>
      );
    }
    if (isOffline) {
      return (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            fontSize: '10px',
            fontWeight: 700,
            color: 'var(--text-muted)',
            background: 'var(--status-offline-dim)',
            padding: '2px 7px',
            borderRadius: '999px',
            border: '1px solid var(--border-subtle)'
          }}
        >
          <WifiOff size={11} /> {formatLastSeen(member.lastUpdated)}
        </span>
      );
    }
    if (isBehind) {
      return (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            fontSize: '10px',
            fontWeight: 800,
            color: 'var(--status-alert)',
            background: 'var(--status-alert-dim)',
            padding: '2px 7px',
            borderRadius: '999px',
            border: '1px solid rgba(239, 68, 68, 0.3)'
          }}
        >
          <AlertCircle size={11} /> Lagging
        </span>
      );
    }
    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          fontSize: '10px',
          fontWeight: 800,
          color: 'var(--status-live)',
          background: 'var(--status-live-dim)',
          padding: '2px 7px',
          borderRadius: '999px',
          border: '1px solid rgba(16, 185, 129, 0.3)'
        }}
      >
        <span className="status-beacon-live" style={{ width: '6px', height: '6px' }} />
        <span>On Track</span>
      </span>
    );
  };

  return (
    <div
      className="cockpit-card"
      style={{
        padding: '12px 14px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px',
        borderLeft: `3px solid ${member.color || 'var(--accent-primary)'}`,
        backgroundColor: 'var(--bg-surface)'
      }}
    >
      {/* Left: Avatar & Identity */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
        <div style={{ position: 'relative', width: '38px', height: '38px', flexShrink: 0 }}>
          <img
            src={member.profileImage}
            alt={member.name}
            style={{
              width: '100%',
              height: '100%',
              borderRadius: '50%',
              border: `2px solid ${member.color || 'var(--accent-primary)'}`,
              objectFit: 'cover',
              background: '#0A0F1D'
            }}
          />
          {member.online && !isPaused && (
            <div
              style={{
                position: 'absolute',
                bottom: '0',
                right: '0',
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                backgroundColor: 'var(--status-live)',
                border: '2px solid var(--bg-surface)'
              }}
            />
          )}
        </div>

        <div style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span
              style={{
                fontWeight: 700,
                fontSize: '14px',
                color: 'var(--text-primary)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}
            >
              {member.name} {isCurrentUser && <span style={{ color: 'var(--accent-cyan)' }}>(You)</span>}
            </span>
            {member.isHost && (
              <span
                style={{
                  fontSize: '9px',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  background: 'var(--accent-primary-dim)',
                  color: 'var(--accent-cyan)',
                  padding: '1px 5px',
                  borderRadius: '4px',
                  border: '1px solid rgba(0, 102, 255, 0.3)'
                }}
              >
                Lead
              </span>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '3px' }}>
            {renderStatusBadge()}

            {/* Inter-Member Relative Distance from User */}
            {!isCurrentUser && member.distanceFromUser !== undefined && (
              <span
                className="font-mono"
                style={{
                  fontSize: '11px',
                  color: member.relativePosition === 'ahead' ? 'var(--status-live)' : 'var(--text-secondary)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '2px',
                  fontWeight: 700
                }}
              >
                {member.relativePosition === 'ahead' && <ArrowUp size={11} color="var(--status-live)" strokeWidth={2.5} />}
                {member.relativePosition === 'behind' && <ArrowDown size={11} color="var(--status-alert)" strokeWidth={2.5} />}
                {formatDistance(member.distanceFromUser)}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Right: Real-Time Metrics & Locate Button */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
        <div style={{ textAlign: 'right' }}>
          <div className="font-mono text-cyan" style={{ fontSize: '13px', fontWeight: 800 }}>
            {member.eta || '--:--'}
          </div>
          <div className="font-mono" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
            {formatDistance(member.distanceRemaining)} • {formatSpeed(member.speed)}
          </div>
        </div>

        {/* Locate / Watch Button */}
        <button
          type="button"
          className="btn-icon"
          onClick={() => onLocate(member)}
          title={`Focus ${member.name} on map`}
          aria-label={`Focus ${member.name} on map`}
          style={{ width: '36px', height: '36px' }}
        >
          <Locate size={16} color="var(--accent-cyan)" />
        </button>
      </div>
    </div>
  );
};
