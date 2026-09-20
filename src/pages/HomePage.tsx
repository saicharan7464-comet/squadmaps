import React, { useState } from 'react';
import {
  Navigation,
  Users,
  MapPin,
  Zap,
  Bell,
  BarChart3,
  Compass,
  ArrowRight,
  Shield,
  Radio,
  ChevronRight
} from 'lucide-react';

interface HomePageProps {
  onStartNavigating: () => void;
  onCreateSquad: () => void;
  onJoinSquad: (squadId: string) => void;
}

const FEATURE_CARDS = [
  {
    icon: Navigation,
    title: 'Smart Navigation',
    desc: 'Turn-by-turn routing with speed, voice guidance, off-route detection, and traffic-aware alternatives.',
    color: 'var(--accent-cyan)'
  },
  {
    icon: Users,
    title: 'Live Squad Tracking',
    desc: 'Convoy on the same shared path while watching every member\'s live speed, heading, and distance from you.',
    color: 'var(--accent-green)'
  },
  {
    icon: MapPin,
    title: 'Regroup Anywhere',
    desc: 'Propose "Let\'s Meet Here" stops with one tap. Squad members vote in real time to coordinate rest breaks.',
    color: 'var(--accent-amber)'
  },
  {
    icon: Zap,
    title: 'Real-Time Updates',
    desc: 'Sub-second position synchronization across all devices with automatic reconnection upon network loss.',
    color: 'var(--accent-cyan)'
  },
  {
    icon: Bell,
    title: 'Smart Alerts',
    desc: 'Automatic non-spamming alerts when a member falls behind by configurable distance or time thresholds.',
    color: 'var(--accent-red)'
  },
  {
    icon: BarChart3,
    title: 'Squad Progress',
    desc: 'Real-time convoy radar summary: see who has arrived, who is on track, and who is offline at a glance.',
    color: 'var(--accent-purple)'
  }
];

export const HomePage: React.FC<HomePageProps> = ({
  onStartNavigating,
  onCreateSquad,
  onJoinSquad
}) => {
  const [inputSquadId, setInputSquadId] = useState('');
  const [showJoinModal, setShowJoinModal] = useState(false);

  const handleJoinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputSquadId.trim()) {
      onJoinSquad(inputSquadId.trim().toUpperCase());
    }
  };

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        overflowY: 'auto',
        backgroundColor: 'var(--bg-primary)',
        color: 'var(--text-primary)',
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      {/* Top Navbar */}
      <header
        style={{
          padding: '16px 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid var(--border-subtle)',
          backgroundColor: 'var(--bg-secondary)',
          position: 'sticky',
          top: 0,
          zIndex: 50
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, var(--accent-cyan), var(--accent-green))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 15px rgba(0, 240, 255, 0.4)'
            }}
          >
            <Compass size={22} color="#0A0E17" />
          </div>
          <div>
            <span style={{ fontSize: '20px', fontWeight: 800, color: '#FFFFFF', letterSpacing: '-0.5px' }}>
              Squad<span className="text-cyan">Nav</span>
            </span>
          </div>
        </div>

        <button
          onClick={onStartNavigating}
          className="btn-secondary"
          style={{ fontSize: '13px', padding: '8px 16px', borderRadius: 'var(--radius-full)' }}
        >
          <span>Open Map</span>
          <ChevronRight size={16} />
        </button>
      </header>

      {/* Hero Section */}
      <section
        style={{
          padding: '60px 24px 40px',
          maxWidth: '860px',
          margin: '0 auto',
          textAlign: 'center'
        }}
      >
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 14px',
            borderRadius: '999px',
            backgroundColor: 'rgba(0, 240, 255, 0.1)',
            border: '1px solid rgba(0, 240, 255, 0.25)',
            color: 'var(--accent-cyan)',
            fontSize: '13px',
            fontWeight: 700,
            marginBottom: '20px'
          }}
        >
          <Radio size={15} />
          <span>Real-Time Group Navigation Platform</span>
        </div>

        <h1
          style={{
            fontSize: 'clamp(36px, 6vw, 64px)',
            fontWeight: 800,
            lineHeight: 1.1,
            letterSpacing: '-1.5px',
            color: '#FFFFFF',
            marginBottom: '20px'
          }}
        >
          Navigate Together. <br />
          <span className="text-cyan">Arrive Together.</span>
        </h1>

        <p
          style={{
            fontSize: 'clamp(16px, 2.5vw, 20px)',
            color: 'var(--text-secondary)',
            maxWidth: '640px',
            margin: '0 auto 36px',
            lineHeight: 1.5
          }}
        >
          SquadNav combines everyday navigation with real-time group travel. Travel together on the same shared path while watching every member's live location, speed, and distance from you.
        </p>

        {/* Action Buttons */}
        <div
          style={{
            display: 'flex',
            gap: '14px',
            justifyContent: 'center',
            flexWrap: 'wrap',
            marginBottom: '40px'
          }}
        >
          <button
            onClick={onCreateSquad}
            className="btn-primary"
            style={{ padding: '16px 28px', fontSize: '16px', borderRadius: 'var(--radius-sm)' }}
          >
            <Users size={20} />
            <span>Create a Squad</span>
          </button>

          <button
            onClick={() => setShowJoinModal(true)}
            className="btn-secondary"
            style={{ padding: '16px 24px', fontSize: '16px', borderRadius: 'var(--radius-sm)' }}
          >
            <span>Join a Squad</span>
          </button>

          <button
            onClick={onStartNavigating}
            className="btn-secondary"
            style={{
              padding: '16px 24px',
              fontSize: '16px',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: 'transparent',
              borderColor: 'var(--border-medium)'
            }}
          >
            <Navigation size={18} color="var(--accent-cyan)" />
            <span>Start Navigating</span>
          </button>
        </div>
      </section>

      {/* Feature Cards Grid */}
      <section
        style={{
          padding: '20px 24px 60px',
          maxWidth: '1100px',
          margin: '0 auto',
          width: '100%'
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '20px'
          }}
        >
          {FEATURE_CARDS.map((card, idx) => {
            const Icon = card.icon;
            return (
              <div
                key={idx}
                className="glass-card"
                style={{
                  padding: '24px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px'
                }}
              >
                <div
                  style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '12px',
                    backgroundColor: `${card.color}15`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: `1px solid ${card.color}33`
                  }}
                >
                  <Icon size={22} color={card.color} />
                </div>
                <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#FFFFFF' }}>
                  {card.title}
                </h3>
                <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  {card.desc}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Join Squad Modal */}
      {showJoinModal && (
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
          onClick={() => setShowJoinModal(false)}
        >
          <div
            className="glass-panel animate-fade-in"
            style={{
              maxWidth: '420px',
              width: '100%',
              padding: '28px',
              backgroundColor: 'var(--bg-secondary)',
              border: '1px solid var(--border-medium)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ fontSize: '20px', fontWeight: 800, color: '#FFFFFF', marginBottom: '8px' }}>
              Join a Squad
            </h3>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '20px' }}>
              Enter the unique Squad ID provided by your convoy host (e.g. SQ-92A4).
            </p>

            <form onSubmit={handleJoinSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <input
                type="text"
                value={inputSquadId}
                onChange={(e) => setInputSquadId(e.target.value)}
                placeholder="Enter Squad ID (e.g. SQ-92A4)"
                className="font-mono"
                style={{
                  width: '100%',
                  padding: '14px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'var(--bg-card)',
                  border: '1px solid var(--border-medium)',
                  color: '#FFFFFF',
                  fontSize: '16px',
                  textAlign: 'center',
                  letterSpacing: '2px',
                  fontWeight: 700,
                  outline: 'none',
                  textTransform: 'uppercase'
                }}
              />

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowJoinModal(false)}
                  className="btn-secondary"
                  style={{ flex: 1, padding: '12px' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!inputSquadId.trim()}
                  className="btn-primary"
                  style={{ flex: 2, padding: '12px', fontSize: '15px' }}
                >
                  Join Squad
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
