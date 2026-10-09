import React from 'react';
import { useAuth } from '../../features/auth/AuthContext';
import { useSquad } from '../../features/squad/SquadContext';
import {
  Compass,
  Home,
  Navigation,
  Users,
  MessageSquare,
  User as UserIcon,
  Zap,
  Shield,
  Radio
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
        height: '60px',
        padding: '0 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: 'var(--bg-glass)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
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
          gap: '10px',
          cursor: 'pointer',
          userSelect: 'none'
        }}
        title="SquadMaps Home"
      >
        <div
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, var(--accent-cyan), var(--accent-green))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 14px rgba(0, 217, 232, 0.3)',
            flexShrink: 0
          }}
        >
          <Compass size={20} color="#080D16" />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span
            style={{
              fontSize: '18px',
              fontWeight: 800,
              letterSpacing: '-0.4px',
              color: 'var(--text-primary)',
              lineHeight: 1.1
            }}
          >
            Squad<span style={{ color: 'var(--accent-cyan)' }}>Maps</span>
          </span>
          <span
            style={{
              fontSize: '10px',
              fontWeight: 700,
              color: 'var(--text-muted)',
              letterSpacing: '0.6px',
              textTransform: 'uppercase'
            }}
          >
            Group Navigation
          </span>
        </div>
      </div>

      {/* Center Navigation Links (Desktop) */}
      <nav
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px'
        }}
        className="hide-mobile"
      >
        <button
          type="button"
          onClick={() => onNavigate('home')}
          className={currentView === 'home' ? 'btn-primary' : 'btn-ghost'}
          style={{
            padding: '7px 14px',
            fontSize: '13px',
            borderRadius: 'var(--radius-full)'
          }}
        >
          <Home size={15} />
          <span>Dashboard</span>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('map')}
          className={currentView === 'map' ? 'btn-primary' : 'btn-ghost'}
          style={{
            padding: '7px 14px',
            fontSize: '13px',
            borderRadius: 'var(--radius-full)'
          }}
        >
          <Navigation size={15} />
          <span>Explore Map</span>
        </button>

        {squad && (
          <button
            type="button"
            onClick={() => onNavigate('map')}
            className="btn-ghost"
            style={{
              padding: '7px 14px',
              fontSize: '13px',
              borderRadius: 'var(--radius-full)',
              color: 'var(--accent-cyan)',
              backgroundColor: 'var(--accent-cyan-dim)',
              border: '1px solid rgba(0, 217, 232, 0.25)'
            }}
          >
            <Radio size={14} className="animate-pulse" />
            <span>Active: {squad.name || squad.destination}</span>
            <span
              style={{
                fontSize: '11px',
                padding: '1px 6px',
                borderRadius: '999px',
                backgroundColor: 'rgba(0, 217, 232, 0.2)'
              }}
            >
              {members.length}
            </span>
          </button>
        )}
      </nav>

      {/* Right Controls: Chat trigger (if squad active) + User Profile Pill */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        {squad && onOpenChat && (
          <button
            type="button"
            onClick={onOpenChat}
            className="btn-icon"
            style={{ width: '38px', height: '38px', position: 'relative' }}
            title="Squad Chat"
            aria-label="Squad Chat"
          >
            <MessageSquare size={17} color="var(--accent-cyan)" />
            {messages.length > 0 && (
              <span
                style={{
                  position: 'absolute',
                  top: '5px',
                  right: '5px',
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--accent-green)'
                }}
              />
            )}
          </button>
        )}

        {/* User Account Pill */}
        <button
          type="button"
          onClick={onOpenAccount}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '4px 10px 4px 5px',
            borderRadius: 'var(--radius-full)',
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-medium)',
            color: 'var(--text-primary)',
            fontSize: '13px',
            fontWeight: 700,
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
          title="Account & Callsign settings"
          aria-label="Account profile"
        >
          <div
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              backgroundColor: user?.color || 'var(--accent-cyan)',
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
              style={{ width: '100%', height: '100%', borderRadius: '50%', backgroundColor: '#101827' }}
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
                color: 'var(--accent-amber)',
                backgroundColor: 'var(--accent-amber-dim)',
                padding: '2px 5px',
                borderRadius: '4px',
                fontWeight: 700
              }}
            >
              GUEST
            </span>
          ) : (
            <span
              style={{
                fontSize: '10px',
                color: 'var(--accent-green)',
                backgroundColor: 'var(--accent-green-dim)',
                padding: '2px 5px',
                borderRadius: '4px',
                fontWeight: 700
              }}
            >
              USER
            </span>
          )}
        </button>
      </div>
    </header>
  );
};
