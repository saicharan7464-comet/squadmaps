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
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(8px)',
        zIndex: 'var(--z-modal)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px'
      }}
      onClick={onClose}
    >
      <div
        className="glass-panel animate-fade-in"
        style={{
          width: '100%',
          maxWidth: '460px',
          padding: '24px',
          backgroundColor: 'var(--bg-secondary)',
          border: '1px solid var(--border-medium)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <MapPin size={22} color="var(--accent-amber)" />
            <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#FFFFFF' }}>
              Let's Meet Here (Regroup)
            </h3>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', color: 'var(--text-muted)' }}>
            <X size={20} />
          </button>
        </div>

        {/* If an active regroup point is currently proposed */}
        {activeRegroupPoint && activeRegroupPoint.status === 'proposed' ? (
          <div
            className="glass-card"
            style={{
              padding: '16px',
              border: '1.5px solid var(--accent-amber)',
              backgroundColor: 'rgba(255, 179, 0, 0.08)',
              marginBottom: '20px'
            }}
          >
            <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--accent-amber)', textTransform: 'uppercase' }}>
              Current Meeting Proposal
            </div>
            <div style={{ fontSize: '18px', fontWeight: 800, color: '#FFFFFF', marginTop: '4px' }}>
              "{activeRegroupPoint.name}"
            </div>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>
              Suggested by: {activeRegroupPoint.suggestedByName}
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
                <strong>{yesVotes}</strong> of <strong>{totalMembers}</strong> members agreed
              </span>
            </div>

            {/* Vote Buttons */}
            <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
              <button
                className="btn-success"
                onClick={() => onVote(true)}
                style={{
                  flex: 1,
                  padding: '10px',
                  fontSize: '14px',
                  opacity: userVote === true ? 1 : 0.85,
                  outline: userVote === true ? '2px solid #FFFFFF' : 'none'
                }}
              >
                <ThumbsUp size={16} />
                <span>Accept</span>
              </button>

              <button
                className="btn-secondary"
                onClick={() => onVote(false)}
                style={{
                  flex: 1,
                  padding: '10px',
                  fontSize: '14px',
                  backgroundColor: 'rgba(255, 61, 113, 0.15)',
                  borderColor: 'var(--accent-red)',
                  color: 'var(--accent-red)',
                  opacity: userVote === false ? 1 : 0.85
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
          <h4 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '8px' }}>
            Suggest a New Regroup Location
          </h4>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '14px' }}>
            Broadcast a temporary meeting point to all squad members to regroup or take a break.
          </p>

          <form onSubmit={handlePropose} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <input
              type="text"
              value={pointName}
              onChange={(e) => setPointName(e.target.value)}
              placeholder="e.g. Highway Food Court, Fuel Station, Toll Plaza"
              style={{
                width: '100%',
                padding: '12px 14px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'var(--bg-card)',
                border: '1px solid var(--border-medium)',
                color: '#FFFFFF',
                fontSize: '14px',
                outline: 'none'
              }}
            />

            <button
              type="submit"
              disabled={!pointName.trim() || !userLocation}
              className="btn-primary"
              style={{
                width: '100%',
                padding: '12px',
                background: 'linear-gradient(135deg, #FFB300, #FF8F00)',
                color: '#0A0E17',
                fontWeight: 800
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
