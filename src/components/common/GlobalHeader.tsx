import React from 'react';
import { useAuth } from '../../features/auth/AuthContext';
import { useSquad } from '../../features/squad/SquadContext';
import {
  Compass,
  Home,
  Navigation,
  MessageSquare,
  Radio,
  Sparkles
} from 'lucide-react';

interface GlobalHeaderProps {
  currentView: 'home' | 'map' | 'join';
  onNavigate: (view: 'home' | 'map') => void;
  onOpenAccount: () => void;
  onOpenChat?: () => void;
}

export const GlobalHeader: React.FC<GlobalHeaderProps> = ({
  currentView,
  onNavigate,
  onOpenAccount,
  onOpenChat
}) => {
  const { user } = useAuth();
  const { squad, members, messages } = useSquad();

  return (
    <header
      style={{
        height: '64px',
        padding: '0 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: 'var(--bg-glass)',
        backdropFilter: 'blur(18px)',
        WebkitBackdropFilter: 'blur(18px)',
        borderBottom: '1px solid var(--border-subtle)',
        position: 'relative',
        zIndex: 50,
        flexShrink: 0
      }}
    >
      {/* Brand Identity */}
      <div
        onClick={() => onNavigate('home')}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          cursor: 'pointer',
          userSelect: 'none'
        }}
        title="SquadMaps Home"
      >
        <div
          style={{
            width: '38px',
            height: '38px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #0066FF 0%, #00D2FF 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 16px rgba(0, 102, 255, 0.35)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            flexShrink: 0
          }}
        >
          <Compass size={20} color="#FFFFFF" strokeWidth={2.4} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span
              style={{
                fontSize: '18px',
                fontWeight: 800,
                letterSpacing: '-0.3px',
                color: 'var(--text-primary)',
                lineHeight: 1.1
              }}
            >
              Squad<span style={{ color: 'var(--accent-cyan)' }}>Maps</span>
            </span>
            <span
              style={{
                fontSize: '9px',
                fontWeight: 800,
                color: 'var(--accent-cyan)',
                backgroundColor: 'var(--accent-cyan-dim)',
                padding: '1px 5px',
                borderRadius: '4px',
                border: '1px solid rgba(0, 210, 255, 0.25)',
                letterSpacing: '0.4px'
              }}
            >
              v1.0
            </span>
          </div>
          <span
            style={{
              fontSize: '10px',
              fontWeight: 600,
              color: 'var(--text-muted)',
              letterSpacing: '0.6px',
              textTransform: 'uppercase',
              marginTop: '2px'
            }}
          >
            Real-Time Convoy Navigation
          </span>
        </div>
      </div>

      {/* Center Navigation Links (Desktop) */}
      <nav
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          background: 'rgba(10, 15, 29, 0.75)',
          padding: '4px',
          borderRadius: 'var(--radius-full)',
          border: '1px solid var(--border-subtle)'
        }}
        className="hide-mobile"
      >
        <button
          type="button"
          onClick={() => onNavigate('home')}
          style={{
            padding: '7px 16px',
            fontSize: '13px',
            fontWeight: currentView === 'home' ? 700 : 500,
            borderRadius: 'var(--radius-full)',
            backgroundColor: currentView === 'home' ? 'rgba(0, 102, 255, 0.2)' : 'transparent',
            border: currentView === 'home' ? '1px solid rgba(0, 102, 255, 0.45)' : '1px solid transparent',
            color: currentView === 'home' ? '#FFFFFF' : 'var(--text-secondary)',
            boxShadow: currentView === 'home' ? '0 2px 8px rgba(0, 102, 255, 0.15)' : 'none',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            transition: 'all 0.15s ease'
          }}
        >
          <Home size={15} color={currentView === 'home' ? 'var(--accent-cyan)' : 'currentColor'} />
          <span>Home</span>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('map')}
          style={{
            padding: '7px 16px',
            fontSize: '13px',
            fontWeight: currentView === 'map' ? 700 : 500,
            borderRadius: 'var(--radius-full)',
            backgroundColor: currentView === 'map' ? 'rgba(0, 102, 255, 0.2)' : 'transparent',
            border: currentView === 'map' ? '1px solid rgba(0, 102, 255, 0.45)' : '1px solid transparent',
            color: currentView === 'map' ? '#FFFFFF' : 'var(--text-secondary)',
            boxShadow: currentView === 'map' ? '0 2px 8px rgba(0, 102, 255, 0.15)' : 'none',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            transition: 'all 0.15s ease'
          }}
        >
          <Navigation size={15} color={currentView === 'map' ? 'var(--accent-cyan)' : 'currentColor'} />
          <span>Live Map</span>
        </button>

        {squad && (
          <button
            type="button"
            onClick={() => onNavigate('map')}
            style={{
              padding: '6px 14px',
              fontSize: '12px',
              fontWeight: 700,
              borderRadius: 'var(--radius-full)',
              color: 'var(--accent-cyan)',
              backgroundColor: 'var(--accent-cyan-dim)',
              border: '1px solid rgba(0, 210, 255, 0.3)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.15s ease'
            }}
          >
            <Radio size={14} className="animate-pulse" color="var(--accent-cyan)" />
            <span>Squad: {squad.name || squad.destination}</span>
            <span
              style={{
                fontSize: '11px',
                padding: '1px 6px',
                borderRadius: '999px',
                backgroundColor: 'rgba(0, 210, 255, 0.2)',
                color: '#FFFFFF'
              }}
            >
              {members.length} {members.length === 1 ? 'rider' : 'riders'}
            </span>
          </button>
        )}
      </nav>

      {/* Right Controls: Chat trigger + User Profile Chip */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        {squad && onOpenChat && (
          <button
            type="button"
            onClick={onOpenChat}
            className="btn-icon"
            style={{ width: '40px', height: '40px', position: 'relative' }}
            title="Squad Radio & Chat"
            aria-label="Squad Radio & Chat"
          >
            <MessageSquare size={17} color="var(--accent-cyan)" />
            {messages.length > 0 && (
              <span
                style={{
                  position: 'absolute',
                  top: '6px',
                  right: '6px',
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--status-live)',
                  boxShadow: '0 0 8px rgba(16, 185, 129, 0.6)'
                }}
              />
            )}
          </button>
        )}

        {/* User Account Chip */}
        <button
          type="button"
          onClick={onOpenAccount}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '9px',
            padding: '4px 12px 4px 6px',
            borderRadius: 'var(--radius-full)',
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-medium)',
            color: 'var(--text-primary)',
            fontSize: '13px',
            fontWeight: 700,
            cursor: 'pointer',
            transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
            boxShadow: 'var(--shadow-sm)'
          }}
          title="Account profile and settings"
          aria-label="Account profile"
        >
          <div
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              backgroundColor: user?.color || 'var(--accent-primary)',
              padding: '1px',
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}
          >
            <img
              src={user?.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${user?.id || 'pilot'}`}
              alt=""
              style={{ width: '100%', height: '100%', borderRadius: '50%', backgroundColor: '#0A0F1D' }}
            />
          </div>
          <span
            style={{
              maxWidth: '120px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}
          >
            {user?.name || 'Guest Pilot'}
          </span>
          {user?.isGuest ? (
            <span
              style={{
                fontSize: '10px',
                color: 'var(--status-warning)',
                backgroundColor: 'var(--status-warning-dim)',
                padding: '2px 6px',
                borderRadius: '4px',
                fontWeight: 800,
                letterSpacing: '0.4px'
              }}
            >
              GUEST
            </span>
          ) : (
            <span
              style={{
                fontSize: '10px',
                color: 'var(--status-live)',
                backgroundColor: 'var(--status-live-dim)',
                padding: '2px 6px',
                borderRadius: '4px',
                fontWeight: 800,
                letterSpacing: '0.4px'
              }}
            >
              PILOT
            </span>
          )}
        </button>
      </div>
    </header>
  );
};
