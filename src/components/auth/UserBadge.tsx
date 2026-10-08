import React, { useState } from 'react';
import { User, Shield, Sparkles, ChevronDown } from 'lucide-react';
import { useAuth } from '../../features/auth/AuthContext';
import { UserProfileModal } from './UserProfileModal';

interface UserBadgeProps {
  onTriggerUpgrade?: () => void;
  compact?: boolean;
}

export const UserBadge: React.FC<UserBadgeProps> = ({ onTriggerUpgrade, compact = false }) => {
  const { user, isGuest } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);

  if (!user) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setIsModalOpen(true)}
        className="glass-card"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          padding: compact ? '4px 8px' : '5px 12px',
          borderRadius: 'var(--radius-full)',
          cursor: 'pointer',
          border: '1px solid var(--border-medium)',
          backgroundColor: 'var(--bg-card)',
          transition: 'all 0.2s ease',
          height: compact ? '36px' : '40px'
        }}
        title={`${user.name} (${isGuest ? 'Guest' : 'Member'}) - Click to view profile`}
      >
        {/* User Avatar */}
        <div style={{ position: 'relative', width: '24px', height: '24px', flexShrink: 0 }}>
          <img
            src={user.avatar}
            alt={user.name}
            style={{
              width: '24px',
              height: '24px',
              borderRadius: '50%',
              backgroundColor: 'var(--bg-secondary)',
              border: `1.5px solid ${user.color || 'var(--accent-cyan)'}`
            }}
          />
          <div
            style={{
              position: 'absolute',
              bottom: '-1px',
              right: '-1px',
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: isGuest ? 'var(--accent-amber)' : 'var(--accent-green)',
              border: '1.5px solid var(--bg-card)'
            }}
          />
        </div>

        {/* User Name */}
        {!compact && (
          <span
            style={{
              fontSize: '13px',
              fontWeight: 700,
              color: 'var(--text-primary)',
              maxWidth: '110px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}
          >
            {user.name}
          </span>
        )}

        {/* Role Tag */}
        <span
          style={{
            fontSize: '10px',
            fontWeight: 800,
            textTransform: 'uppercase',
            padding: '2px 6px',
            borderRadius: '999px',
            letterSpacing: '0.4px',
            backgroundColor: isGuest ? 'rgba(255, 179, 0, 0.15)' : 'rgba(0, 240, 255, 0.15)',
            color: isGuest ? 'var(--accent-amber)' : 'var(--accent-cyan)',
            border: `1px solid ${isGuest ? 'rgba(255, 179, 0, 0.3)' : 'rgba(0, 240, 255, 0.3)'}`
          }}
        >
          {isGuest ? 'Guest' : 'Member'}
        </span>

        <ChevronDown size={14} color="var(--text-muted)" style={{ marginLeft: '-2px' }} />
      </button>

      <UserProfileModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onTriggerUpgrade={onTriggerUpgrade}
      />
    </>
  );
};
