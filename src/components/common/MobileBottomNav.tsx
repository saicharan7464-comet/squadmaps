import React from 'react';
import { Home, Navigation, Users, User, Radio } from 'lucide-react';
import { useSquad } from '../../features/squad/SquadContext';
import { useAuth } from '../../features/auth/AuthContext';

interface MobileBottomNavProps {
  currentView: 'home' | 'map' | 'join';
  onNavigate: (view: 'home' | 'map') => void;
  onOpenAccount: () => void;
  onOpenSquadAction: () => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  currentView,
  onNavigate,
  onOpenAccount,
  onOpenSquadAction
}) => {
  const { squad, members } = useSquad();
  const { user } = useAuth();

  return (
    <nav
      className="mobile-bottom-nav"
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        height: 'calc(62px + env(safe-area-inset-bottom, 0px))',
        backgroundColor: 'rgba(10, 15, 29, 0.96)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderTop: '1px solid var(--border-subtle)',
        display: 'flex',
        alignItems: 'flex-start',
        paddingTop: '6px',
        justifyContent: 'space-around',
        zIndex: 90,
        paddingBottom: 'env(safe-area-inset-bottom, 6px)',
        boxSizing: 'border-box',
        boxShadow: '0 -4px 24px rgba(0, 0, 0, 0.6)'
      }}
    >
      {/* 1. Home Tab */}
      <button
        type="button"
        onClick={() => onNavigate('home')}
        style={{
          flex: 1,
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '3px',
          background: 'none',
          color: currentView === 'home' ? 'var(--accent-cyan)' : 'var(--text-muted)',
          fontSize: '11px',
          fontWeight: currentView === 'home' ? 700 : 500,
          border: 'none',
          cursor: 'pointer',
          padding: 0,
          transition: 'all 0.15s ease'
        }}
      >
        <div
          style={{
            padding: '3px 12px',
            borderRadius: 'var(--radius-full)',
            backgroundColor: currentView === 'home' ? 'var(--accent-cyan-dim)' : 'transparent',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <Home size={19} strokeWidth={currentView === 'home' ? 2.5 : 2} />
        </div>
        <span>Home</span>
      </button>

      {/* 2. Map Tab */}
      <button
        type="button"
        onClick={() => onNavigate('map')}
        style={{
          flex: 1,
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '3px',
          background: 'none',
          color: currentView === 'map' ? 'var(--accent-cyan)' : 'var(--text-muted)',
          fontSize: '11px',
          fontWeight: currentView === 'map' ? 700 : 500,
          border: 'none',
          cursor: 'pointer',
          padding: 0,
          transition: 'all 0.15s ease'
        }}
      >
        <div
          style={{
            padding: '3px 12px',
            borderRadius: 'var(--radius-full)',
            backgroundColor: currentView === 'map' ? 'var(--accent-cyan-dim)' : 'transparent',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <Navigation size={19} strokeWidth={currentView === 'map' ? 2.5 : 2} />
        </div>
        <span>Live Map</span>
      </button>

      {/* 3. Squad Tab */}
      <button
        type="button"
        onClick={onOpenSquadAction}
        style={{
          flex: 1,
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '3px',
          background: 'none',
          color: squad ? 'var(--status-live)' : 'var(--text-muted)',
          fontSize: '11px',
          fontWeight: squad ? 700 : 500,
          border: 'none',
          cursor: 'pointer',
          position: 'relative',
          padding: 0,
          transition: 'all 0.15s ease'
        }}
      >
        <div
          style={{
            padding: '3px 12px',
            borderRadius: 'var(--radius-full)',
            backgroundColor: squad ? 'var(--status-live-dim)' : 'transparent',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          {squad ? <Radio size={19} className="animate-pulse" /> : <Users size={19} />}
        </div>
        <span>{squad ? `Squad (${members.length})` : 'Squad'}</span>
      </button>

      {/* 4. Account Tab */}
      <button
        type="button"
        onClick={onOpenAccount}
        style={{
          flex: 1,
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '3px',
          background: 'none',
          color: 'var(--text-muted)',
          fontSize: '11px',
          fontWeight: 500,
          border: 'none',
          cursor: 'pointer',
          padding: 0,
          transition: 'all 0.15s ease'
        }}
      >
        <div
          style={{
            padding: '3px 12px',
            borderRadius: 'var(--radius-full)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <User size={19} />
        </div>
        <span style={{ maxWidth: '64px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={user?.name || 'Account'}>
          Account
        </span>
      </button>
    </nav>
  );
};
