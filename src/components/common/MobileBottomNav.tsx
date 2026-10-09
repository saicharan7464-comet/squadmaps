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
        height: '62px',
        backgroundColor: 'rgba(16, 24, 39, 0.94)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderTop: '1px solid var(--border-subtle)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-around',
        zIndex: 90,
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        boxSizing: 'border-box'
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
          padding: 0
        }}
      >
        <Home size={20} />
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
          padding: 0
        }}
      >
        <Navigation size={20} />
        <span>Map</span>
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
          color: squad ? 'var(--accent-green)' : 'var(--text-muted)',
          fontSize: '11px',
          fontWeight: squad ? 700 : 500,
          border: 'none',
          cursor: 'pointer',
          position: 'relative',
          padding: 0
        }}
      >
        {squad ? <Radio size={20} className="animate-pulse" /> : <Users size={20} />}
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
          padding: 0
        }}
      >
        <User size={20} />
        <span style={{ maxWidth: '64px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {user?.name ? user.name.split(' ')[0] : 'Profile'}
        </span>
      </button>
    </nav>
  );
};
