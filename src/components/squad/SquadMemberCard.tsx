import React from 'react';
import { SquadMember } from '../../types/squad';
import { formatDistance, formatSpeed, formatLastSeen } from '../../utils/format';
import { Locate, CheckCircle, AlertCircle, WifiOff, PauseCircle, Car, ArrowUp, ArrowDown } from 'lucide-react';

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
            fontSize: '11px',
            fontWeight: 700,
            color: 'var(--accent-green)',
            background: 'var(--accent-green-dim)',
            padding: '2px 8px',
            borderRadius: '999px'
          }}
        >
          <CheckCircle size={12} /> Arrived
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
            fontSize: '11px',
            fontWeight: 700,
            color: 'var(--accent-amber)',
            background: 'var(--accent-amber-dim)',
            padding: '2px 8px',
            borderRadius: '999px'
          }}
        >
          <PauseCircle size={12} /> Paused
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
            fontSize: '11px',
            fontWeight: 700,
            color: 'var(--text-muted)',
            background: 'rgba(107, 114, 128, 0.15)',
            padding: '2px 8px',
            borderRadius: '999px'
          }}
        >
          <WifiOff size={12} /> {formatLastSeen(member.lastUpdated)}
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
            fontSize: '11px',
            fontWeight: 700,
            color: 'var(--accent-red)',
            background: 'var(--accent-red-dim)',
            padding: '2px 8px',
            borderRadius: '999px'
          }}
        >
          <AlertCircle size={12} /> Falling Behind
        </span>
      );
    }
    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          fontSize: '11px',
          fontWeight: 700,
          color: 'var(--accent-green)',
          background: 'var(--accent-green-dim)',
          padding: '2px 8px',
          borderRadius: '999px'
        }}
      >
        On Track
      </span>
    );
  };

  return (
    <div
      className="glass-card"
      style={{
        padding: '14px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px',
        borderLeft: `4px solid ${member.color || 'var(--accent-cyan)'}`
      }}
    >
      {/* Left: Avatar & Identity */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
        <div style={{ position: 'relative', width: '42px', height: '42px', flexShrink: 0 }}>
          <img
            src={member.profileImage}
            alt={member.name}
            style={{
              width: '100%',
              height: '100%',
              borderRadius: '50%',
              border: `2px solid ${member.color || 'var(--accent-cyan)'}`,
              objectFit: 'cover',
              background: 'var(--bg-tertiary)'
            }}
          />
          {member.online && !isPaused && (
            <div
              style={{
                position: 'absolute',
                bottom: '0',
                right: '0',
                width: '12px',
                height: '12px',
                borderRadius: '50%',
                backgroundColor: 'var(--accent-green)',
                border: '2px solid var(--bg-card)'
              }}
            />
          )}
        </div>

        <div style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span
              style={{
                fontWeight: 700,
                fontSize: '15px',
                color: '#FFFFFF',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}
            >
              {member.name} {isCurrentUser && '(You)'}
            </span>
            {member.isHost && (
              <span
                style={{
                  fontSize: '9px',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  background: 'rgba(0, 240, 255, 0.2)',
                  color: 'var(--accent-cyan)',
                  padding: '1px 5px',
                  borderRadius: '4px'
                }}
              >
                Host
              </span>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
            {renderStatusBadge()}

            {/* Inter-Member Distance from User */}
            {!isCurrentUser && member.distanceFromUser !== undefined && (
              <span
                className="font-mono"
                style={{
                  fontSize: '12px',
                  color: 'var(--accent-cyan)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '2px',
                  fontWeight: 600
                }}
              >
                {member.relativePosition === 'ahead' && <ArrowUp size={12} color="var(--accent-green)" />}
                {member.relativePosition === 'behind' && <ArrowDown size={12} color="var(--accent-red)" />}
                {formatDistance(member.distanceFromUser)} away
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Right: Real-Time Metrics & Locate Button */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
        <div style={{ textAlign: 'right' }}>
          <div className="font-mono text-cyan" style={{ fontSize: '13px', fontWeight: 700 }}>
            {member.eta || 'N/A'}
          </div>
          <div className="font-mono" style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
            {formatDistance(member.distanceRemaining)} • {formatSpeed(member.speed)}
          </div>
        </div>

        {/* Locate / Watch Button */}
        <button
          className="btn-icon"
          onClick={() => onLocate(member)}
          title={`Locate ${member.name} on map`}
          style={{ width: '38px', height: '38px' }}
        >
          <Locate size={18} color="var(--accent-cyan)" />
        </button>
      </div>
    </div>
  );
};
