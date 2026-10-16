import React, { useState } from 'react';
import { LatLng } from '../../types/navigation';
import { RegroupPoint } from '../../types/squad';
import { MapPin, X, Check, ThumbsUp, ThumbsDown, Users } from 'lucide-react';

interface RegroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeRegroupPoint: RegroupPoint | null;
  totalMembers: number;
  currentUserId: string;
  userLocation: LatLng | null;
  onPropose: (name: string, coords: LatLng) => void;
  onVote: (accept: boolean) => void;
}

export const RegroupModal: React.FC<RegroupModalProps> = ({
  isOpen,
  onClose,
  activeRegroupPoint,
  totalMembers,
  currentUserId,
  userLocation,
  onPropose,
  onVote
}) => {
  const [pointName, setPointName] = useState('');

  if (!isOpen) return null;

  const handlePropose = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pointName.trim() || !userLocation) return;
    onPropose(pointName.trim(), userLocation);
    setPointName('');
  };

  const hasVoted = activeRegroupPoint?.votes?.[currentUserId] !== undefined;
  const userVote = activeRegroupPoint?.votes?.[currentUserId];

  const totalVotes = activeRegroupPoint ? Object.keys(activeRegroupPoint.votes).length : 0;
  const yesVotes = activeRegroupPoint
    ? Object.values(activeRegroupPoint.votes).filter(Boolean).length
    : 0;

  return (
    <div
      className="modal-overlay"
      style={{
        zIndex: 'var(--z-modal)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px'
      }}
      onClick={onClose}
    >
      <div
        className="cockpit-card animate-modal-in"
        style={{
          width: '100%',
          maxWidth: '460px',
          padding: '24px',
          boxShadow: 'var(--shadow-xl)',
          position: 'relative'
        }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="regroup-modal-title"
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'rgba(245, 158, 11, 0.12)',
                border: '1px solid rgba(245, 158, 11, 0.25)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <MapPin size={20} color="var(--accent-amber)" />
            </div>
            <div>
              <h3 id="regroup-modal-title" style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.02em' }}>
                Regroup Point
              </h3>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                Coordinate a rest stop or meeting point
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="btn-icon"
            aria-label="Close regroup modal"
            style={{ width: '34px', height: '34px', color: 'var(--text-secondary)' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* If an active regroup point is currently proposed */}
        {activeRegroupPoint && activeRegroupPoint.status === 'proposed' ? (
          <div
            style={{
              padding: '16px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid rgba(245, 158, 11, 0.35)',
              backgroundColor: 'rgba(245, 158, 11, 0.06)',
              marginBottom: '20px'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="badge badge-amber" style={{ fontSize: '10px', letterSpacing: '0.04em' }}>
                ACTIVE PROPOSAL
              </span>
            </div>
            <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)', marginTop: '8px', letterSpacing: '-0.01em' }}>
              "{activeRegroupPoint.name}"
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
              Suggested by: <strong style={{ color: 'var(--text-primary)' }}>{activeRegroupPoint.suggestedByName}</strong>
            </div>

            {/* Voting Tally */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginTop: '12px',
                fontSize: '13px',
                color: 'var(--text-primary)'
              }}
            >
              <Users size={16} color="var(--accent-cyan)" />
              <span>
                <strong style={{ color: 'var(--accent-cyan)' }}>{yesVotes}</strong> of <strong>{totalMembers}</strong> members agreed
              </span>
            </div>

            {/* Vote Buttons */}
            <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => onVote(true)}
                style={{
                  flex: 1,
                  padding: '10px',
                  fontSize: '14px',
                  borderColor: userVote === true ? 'var(--status-live)' : 'var(--border-subtle)',
                  color: userVote === true ? 'var(--status-live)' : 'var(--text-primary)',
                  backgroundColor: userVote === true ? 'rgba(0, 214, 160, 0.15)' : 'var(--bg-elevated)',
                  fontWeight: 700
                }}
              >
                <ThumbsUp size={16} />
                <span>Accept</span>
              </button>

              <button
                type="button"
                className="btn-secondary"
                onClick={() => onVote(false)}
                style={{
                  flex: 1,
                  padding: '10px',
                  fontSize: '14px',
                  backgroundColor: userVote === false ? 'rgba(239, 68, 68, 0.15)' : 'var(--bg-elevated)',
                  borderColor: userVote === false ? 'var(--status-alert)' : 'var(--border-subtle)',
                  color: userVote === false ? 'var(--status-alert)' : 'var(--text-secondary)',
                  fontWeight: 700
                }}
              >
                <ThumbsDown size={16} />
                <span>Reject</span>
              </button>
            </div>
          </div>
        ) : null}

        {/* Suggest new meeting point */}
        <div>
          <h4 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>
            Broadcast New Meeting Point
          </h4>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '14px', lineHeight: 1.4 }}>
            Propose your current GPS location as a stop to all squad members to regroup or take a break.
          </p>

          <form onSubmit={handlePropose} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <input
              type="text"
              value={pointName}
              onChange={(e) => setPointName(e.target.value)}
              placeholder="e.g. Highway Food Court, Fuel Station, Rest Area"
              className="input-base"
              style={{
                width: '100%',
                fontSize: '14px'
              }}
            />

            <button
              type="submit"
              disabled={!pointName.trim() || !userLocation}
              className="btn-primary"
              style={{
                width: '100%',
                padding: '12px',
                background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
                color: '#050811',
                fontWeight: 800,
                opacity: !pointName.trim() || !userLocation ? 0.6 : 1,
                border: 'none',
                boxShadow: '0 4px 14px rgba(245, 158, 11, 0.25)'
              }}
            >
              <MapPin size={18} />
              <span>Broadcast Meeting Point</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
