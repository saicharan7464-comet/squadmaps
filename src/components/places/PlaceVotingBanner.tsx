import React from 'react';
import { PlaceSuggestion } from '../../types/places';
import { ThumbsUp, ThumbsDown, Utensils, Fuel, Coffee, Hotel, Building, MapPin, X } from 'lucide-react';

interface PlaceVotingBannerProps {
  suggestion: PlaceSuggestion;
  currentUserId: string;
  totalMembers: number;
  onVote: (suggestionId: string, vote: boolean) => void;
  onClose?: () => void;
}

export const PlaceVotingBanner: React.FC<PlaceVotingBannerProps> = ({
  suggestion,
  currentUserId,
  totalMembers,
  onVote,
  onClose
}) => {
  const userVote = suggestion.votes?.[currentUserId];
  const yesVotes = Object.values(suggestion.votes || {}).filter(Boolean).length;

  return (
    <div
      className="cockpit-card animate-slide-down"
      style={{
        padding: '16px 18px',
        backgroundColor: 'rgba(10, 15, 29, 0.95)',
        border: '1px solid rgba(139, 92, 246, 0.4)',
        boxShadow: 'var(--shadow-xl)'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: 'rgba(139, 92, 246, 0.15)',
              border: '1px solid rgba(139, 92, 246, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}
          >
            <MapPin size={18} color="var(--accent-purple)" />
          </div>
          <div>
            <div style={{ fontSize: '10px', fontWeight: 800, color: 'var(--accent-purple)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Stop Proposal by {suggestion.createdByName}
            </div>
            <div style={{ fontSize: '15px', fontWeight: 800, color: '#FFFFFF', letterSpacing: '-0.01em' }}>
              "Should we stop here?"
            </div>
          </div>
        </div>

        {onClose && (
          <button
            onClick={onClose}
            className="btn-icon"
            style={{ width: '28px', height: '28px', color: 'var(--text-muted)' }}
            aria-label="Dismiss stop suggestion"
          >
            <X size={15} />
          </button>
        )}
      </div>

      <div
        style={{
          marginTop: '10px',
          padding: '10px 14px',
          borderRadius: 'var(--radius-sm)',
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}
      >
        <div style={{ minWidth: 0, paddingRight: '12px' }}>
          <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {suggestion.place.name}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {suggestion.place.address}
          </div>
        </div>

        <div className="badge badge-cyan" style={{ fontSize: '11px', flexShrink: 0, fontWeight: 700 }}>
          {yesVotes} / {totalMembers} Agrees
        </div>
      </div>

      {/* Action Buttons */}
      <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
        <button
          className="btn-primary"
          onClick={() => onVote(suggestion.id, true)}
          style={{
            flex: 1,
            padding: '9px 12px',
            fontSize: '13px',
            background: userVote === true
              ? 'linear-gradient(135deg, #00D6A0 0%, #059669 100%)'
              : 'linear-gradient(135deg, #0066FF 0%, #0052CC 100%)',
            border: 'none',
            opacity: userVote === true ? 1 : 0.85
          }}
        >
          <ThumbsUp size={15} />
          <span>Yes, Stop Here</span>
        </button>

        <button
          className="btn-secondary"
          onClick={() => onVote(suggestion.id, false)}
          style={{
            flex: 1,
            padding: '9px 12px',
            fontSize: '13px',
            backgroundColor: userVote === false ? 'rgba(239, 68, 68, 0.2)' : 'var(--bg-elevated)',
            borderColor: userVote === false ? 'var(--status-alert)' : 'var(--border-subtle)',
            color: userVote === false ? 'var(--status-alert)' : 'var(--text-secondary)',
            fontWeight: 700,
            opacity: userVote === false ? 1 : 0.85
          }}
        >
          <ThumbsDown size={15} />
          <span>No, Keep Going</span>
        </button>
      </div>
    </div>
  );
};
