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
      className="glass-panel animate-slide-down"
      style={{
        padding: '14px 18px',
        backgroundColor: 'rgba(22, 33, 53, 0.95)',
        border: '1.5px solid var(--accent-purple)',
        boxShadow: 'var(--shadow-lg)'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '18px' }}>🛑</span>
          <div>
            <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--accent-purple)', textTransform: 'uppercase' }}>
              Stop Suggestion by {suggestion.createdByName}
            </div>
            <div style={{ fontSize: '16px', fontWeight: 800, color: '#FFFFFF' }}>
              "Should we stop here?"
            </div>
          </div>
        </div>

        {onClose && (
          <button onClick={onClose} style={{ background: 'transparent', color: 'var(--text-muted)' }}>
            <X size={16} />
          </button>
        )}
      </div>

      <div
        style={{
          marginTop: '8px',
          padding: '8px 12px',
          borderRadius: 'var(--radius-sm)',
          backgroundColor: 'var(--bg-card)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}
      >
        <div>
          <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text-primary)' }}>
            {suggestion.place.name}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
            {suggestion.place.address}
          </div>
        </div>

        <div style={{ fontSize: '12px', color: 'var(--accent-cyan)', fontWeight: 700 }}>
          {yesVotes} / {totalMembers} Voted Yes
        </div>
      </div>

      {/* Action Buttons */}
      <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
        <button
          className="btn-success"
          onClick={() => onVote(suggestion.id, true)}
          style={{
            flex: 1,
            padding: '8px 12px',
            fontSize: '13px',
            opacity: userVote === true ? 1 : 0.8,
            outline: userVote === true ? '2px solid #FFFFFF' : 'none'
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
            padding: '8px 12px',
            fontSize: '13px',
            backgroundColor: 'rgba(255, 61, 113, 0.15)',
            borderColor: 'var(--accent-red)',
            color: 'var(--accent-red)',
            opacity: userVote === false ? 1 : 0.8
          }}
        >
          <ThumbsDown size={15} />
          <span>No, Keep Going</span>
        </button>
      </div>
    </div>
  );
};
