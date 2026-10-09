import React, { useState, useEffect } from 'react';
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
  ChevronRight,
  Camera,
  QrCode,
  Clipboard,
  Link2,
  Check,
  User,
  X,
  Share2,
  Sparkles,
  Car
} from 'lucide-react';
import { useAuth } from '../features/auth/AuthContext';
import { useSquad } from '../features/squad/SquadContext';
import { parseSquadId, getInviteUrl } from '../utils/inviteUrl';
import { QRScannerModal } from '../components/common/QRScannerModal';

interface HomePageProps {
  onOpenMap?: () => void;
  onStartNavigating: () => void;
  onCreateSquad: () => void;
  onJoinSquad: (squadId: string) => void;
  onOpenAccount?: () => void;
}

const BENEFIT_CARDS = [
  {
    icon: Navigation,
    title: 'Precision Group Routing',
    desc: 'Turn-by-turn navigation with speed monitoring, voice guidance, and vehicle-specific paths for cars, bikes, and transit.',
    accent: 'var(--accent-cyan)'
  },
  {
    icon: Users,
    title: 'Live Convoy Radar',
    desc: 'Watch every squad member on the same shared path with real-time location sync, relative distance, and heading.',
    accent: 'var(--accent-green)'
  },
  {
    icon: MapPin,
    title: 'One-Tap Regroup Points',
    desc: 'Propose "Let\'s Meet Here" stops anytime. Members cast quick votes on suggested pit stops and rest areas.',
    accent: 'var(--accent-amber)'
  },
  {
    icon: Bell,
    title: 'Smart Separation Alerts',
    desc: 'Automatic alerts notify the group when a vehicle gets stuck in traffic or falls behind the designated threshold.',
    accent: 'var(--accent-red)'
  }
];

export const HomePage: React.FC<HomePageProps> = ({
  onOpenMap,
  onStartNavigating,
  onCreateSquad,
  onJoinSquad,
  onOpenAccount
}) => {
  const { user, updateProfileName } = useAuth();
  const { squad, members } = useSquad();

  const [inputSquadId, setInputSquadId] = useState('');
  const [joinUserName, setJoinUserName] = useState(user?.name || '');
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [feedback, setFeedback] = useState<{ text: string; isError?: boolean } | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    if (user?.name && !joinUserName) {
      setJoinUserName(user.name);
    }
  }, [user?.name]);

  const handleInputChange = (val: string) => {
    setFeedback(null);
    const parsed = parseSquadId(val);
    if (parsed && (val.includes('http') || val.includes('/') || val.includes('join'))) {
      setInputSquadId(parsed);
      setFeedback({ text: `Recognized Invite URL → ${parsed}` });
    } else {
      setInputSquadId(val.toUpperCase());
    }
  };

  const handlePasteClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        const parsed = parseSquadId(text);
        if (parsed) {
          setInputSquadId(parsed);
          setFeedback({ text: `Pasted & parsed Squad ID: ${parsed}` });
        } else {
          setInputSquadId(text.trim());
          setFeedback({ text: 'Could not extract valid squad code from clipboard text.', isError: true });
        }
      }
    } catch {
      setFeedback({ text: 'Please paste the URL or Squad ID directly into the input.', isError: true });
    }
  };

  const handleJoinSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const parsed = parseSquadId(inputSquadId);
    if (!parsed) {
      setFeedback({ text: 'Please enter a valid Squad ID (e.g. SQ-92A4) or invite URL.', isError: true });
      return;
    }

    if (joinUserName.trim()) {
      updateProfileName(joinUserName.trim());
    }

    setShowJoinModal(false);
    onJoinSquad(parsed);
  };

  const handleScanSuccess = (scannedSquadId: string) => {
    setShowScanner(false);
    setInputSquadId(scannedSquadId);
    if (joinUserName.trim()) {
      updateProfileName(joinUserName.trim());
    }
    setShowJoinModal(false);
    onJoinSquad(scannedSquadId);
  };

  const handleCopyActiveInvite = () => {
    if (!squad) return;
    const url = getInviteUrl(squad.squadId);
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
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
      <div style={{ padding: '24px 20px 80px', maxWidth: '1080px', margin: '0 auto', width: '100%' }}>
        {/* ACTIVE CONVOY ALERT / RESUME BANNER (if squad active) */}
        {squad && (
          <div
            className="elevated-card animate-slide-down"
            style={{
              padding: '16px 20px',
              marginBottom: '28px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '14px',
              border: '1px solid rgba(0, 217, 232, 0.35)',
              background: 'linear-gradient(135deg, rgba(21, 31, 48, 0.95), rgba(16, 24, 39, 0.95))',
              boxShadow: 'var(--shadow-md), 0 0 20px rgba(0, 217, 232, 0.1)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'var(--accent-cyan-dim)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--accent-cyan)'
                }}
              >
                <Radio size={22} className="animate-pulse" />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className="badge badge-cyan">ACTIVE SQUAD</span>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Code: {squad.squadId}</span>
                </div>
                <h3 style={{ margin: '4px 0 0', fontSize: '17px', fontWeight: 800 }}>
                  {squad.name || `Trip to ${squad.destination}`}
                </h3>
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                  {members.length} {members.length === 1 ? 'member' : 'members'} traveling to {squad.destination}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <button
                type="button"
                className="btn-ghost"
                onClick={handleCopyActiveInvite}
                style={{ fontSize: '13px', padding: '8px 12px' }}
                title="Copy squad invite link"
              >
                {copiedLink ? <Check size={16} color="var(--accent-green)" /> : <Share2 size={16} />}
                <span>{copiedLink ? 'Link Copied' : 'Share'}</span>
              </button>

              <button
                type="button"
                className="btn-primary"
                onClick={onOpenMap || onStartNavigating}
                style={{ fontSize: '13px', padding: '9px 18px' }}
              >
                <Navigation size={15} />
                <span>Resume Journey</span>
              </button>
            </div>
          </div>
        )}

        {/* HERO SECTION */}
        <section style={{ textAlign: 'center', padding: '30px 10px 40px' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 14px',
              borderRadius: 'var(--radius-full)',
              backgroundColor: 'var(--accent-cyan-dim)',
              border: '1px solid rgba(0, 217, 232, 0.25)',
              color: 'var(--accent-cyan)',
              fontSize: '12px',
              fontWeight: 700,
              marginBottom: '20px',
              letterSpacing: '0.5px'
            }}
          >
            <Sparkles size={14} />
            <span>REAL-TIME COCKPIT GROUP NAVIGATION</span>
          </div>

          <h1
            style={{
              fontSize: 'clamp(32px, 5.5vw, 54px)',
              fontWeight: 800,
              lineHeight: 1.15,
              letterSpacing: '-1px',
              margin: '0 auto 16px',
              maxWidth: '800px',
              color: 'var(--text-primary)'
            }}
          >
            Travel in Convoy. <br />
            <span style={{ color: 'var(--accent-cyan)' }}>Never Lose Your Squad.</span>
          </h1>

          <p
            style={{
              fontSize: 'clamp(15px, 2vw, 18px)',
              color: 'var(--text-secondary)',
              maxWidth: '620px',
              margin: '0 auto 32px',
              lineHeight: 1.55
            }}
          >
            Coordinate group drives, motorcycle convoys, and weekend road trips on a shared live route with synchronized GPS tracking, smart distance alerts, and one-tap regroup stops.
          </p>

          {/* Quick Action Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '16px',
              maxWidth: '920px',
              margin: '0 auto 40px'
            }}
          >
            {/* Card 1: Create Squad */}
            <div
              className="surface-card glass-card"
              style={{
                padding: '24px 20px',
                textAlign: 'left',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                cursor: 'pointer'
              }}
              onClick={onCreateSquad}
            >
              <div>
                <div
                  style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: 'var(--accent-cyan-dim)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--accent-cyan)',
                    marginBottom: '16px'
                  }}
                >
                  <Users size={22} />
                </div>
                <h3 style={{ fontSize: '18px', fontWeight: 800, margin: '0 0 8px' }}>
                  Host a Squad
                </h3>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.45, margin: 0 }}>
                  Set a destination, generate optimal route choices, and invite your friends with a shareable 6-character code.
                </p>
              </div>

              <div style={{ marginTop: '20px' }}>
                <button
                  type="button"
                  className="btn-primary"
                  style={{ width: '100%', fontSize: '14px', padding: '11px' }}
                >
                  <span>Start a Squad Journey</span>
                  <ArrowRight size={16} />
                </button>
              </div>
            </div>

            {/* Card 2: Join Squad */}
            <div
              className="surface-card glass-card"
              style={{
                padding: '24px 20px',
                textAlign: 'left',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                cursor: 'pointer'
              }}
              onClick={() => setShowJoinModal(true)}
            >
              <div>
                <div
                  style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: 'var(--accent-green-dim)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--accent-green)',
                    marginBottom: '16px'
                  }}
                >
                  <Link2 size={22} />
                </div>
                <h3 style={{ fontSize: '18px', fontWeight: 800, margin: '0 0 8px' }}>
                  Join an Existing Squad
                </h3>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.45, margin: 0 }}>
                  Got an invite link or QR code from your group leader? Enter code or scan with camera to join immediately.
                </p>
              </div>

              <div style={{ marginTop: '20px' }}>
                <button
                  type="button"
                  className="btn-secondary"
                  style={{ width: '100%', fontSize: '14px', padding: '11px' }}
                >
                  <span>Enter Code or Scan QR</span>
                  <QrCode size={16} />
                </button>
              </div>
            </div>

            {/* Card 3: Explore Map Solo */}
            <div
              className="surface-card glass-card"
              style={{
                padding: '24px 20px',
                textAlign: 'left',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                cursor: 'pointer'
              }}
              onClick={onOpenMap || onStartNavigating}
            >
              <div>
                <div
                  style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: 'rgba(100, 116, 139, 0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--text-primary)',
                    marginBottom: '16px'
                  }}
                >
                  <Navigation size={22} />
                </div>
                <h3 style={{ fontSize: '18px', fontWeight: 800, margin: '0 0 8px' }}>
                  Explore Map
                </h3>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.45, margin: 0 }}>
                  Search destinations, preview alternatives across vehicle modes, and test turn-by-turn routing solo.
                </p>
              </div>

              <div style={{ marginTop: '20px' }}>
                <button
                  type="button"
                  className="btn-ghost"
                  style={{
                    width: '100%',
                    fontSize: '14px',
                    padding: '11px',
                    border: '1px solid var(--border-medium)',
                    backgroundColor: 'rgba(255, 255, 255, 0.03)'
                  }}
                >
                  <span>Open Interactive Map</span>
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* CORE CAPABILITIES SECTION */}
        <section style={{ marginTop: '20px' }}>
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <span
              style={{
                fontSize: '12px',
                fontWeight: 700,
                color: 'var(--accent-cyan)',
                textTransform: 'uppercase',
                letterSpacing: '1px'
              }}
            >
              DESIGNED FOR THE OPEN ROAD
            </span>
            <h2 style={{ fontSize: '26px', fontWeight: 800, margin: '8px 0 0' }}>
              Engineered for Convoy Coordination
            </h2>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: '16px'
            }}
          >
            {BENEFIT_CARDS.map((card, idx) => {
              const Icon = card.icon;
              return (
                <div
                  key={idx}
                  className="surface-card"
                  style={{
                    padding: '20px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-subtle)'
                  }}
                >
                  <div
                    style={{
                      width: '38px',
                      height: '38px',
                      borderRadius: '10px',
                      backgroundColor: 'rgba(255, 255, 255, 0.05)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: card.accent,
                      marginBottom: '14px'
                    }}
                  >
                    <Icon size={20} />
                  </div>
                  <h3 style={{ fontSize: '16px', fontWeight: 700, margin: '0 0 8px', color: 'var(--text-primary)' }}>
                    {card.title}
                  </h3>
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>
                    {card.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      {/* JOIN SQUAD MODAL */}
      {showJoinModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 999,
            backgroundColor: 'rgba(8, 13, 22, 0.85)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px'
          }}
          onClick={() => setShowJoinModal(false)}
        >
          <div
            className="surface-card animate-scale-in"
            style={{
              width: '100%',
              maxWidth: '420px',
              padding: '26px 22px',
              position: 'relative',
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-medium)',
              boxShadow: 'var(--shadow-elevated)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setShowJoinModal(false)}
              className="btn-icon"
              style={{ position: 'absolute', top: '16px', right: '16px', width: '32px', height: '32px' }}
              title="Close modal"
            >
              <X size={16} />
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  backgroundColor: 'var(--accent-green-dim)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--accent-green)'
                }}
              >
                <Link2 size={20} />
              </div>
              <h2 style={{ fontSize: '18px', fontWeight: 800, margin: 0 }}>Join a Squad</h2>
            </div>

            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '0 0 18px', lineHeight: 1.4 }}>
              Enter the 6-character Squad Code or paste an invite link shared by your trip leader.
            </p>

            <form onSubmit={handleJoinSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label
                  htmlFor="join-callsign-input"
                  style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '5px' }}
                >
                  YOUR CALLSIGN / NAME
                </label>
                <div style={{ position: 'relative' }}>
                  <User
                    size={16}
                    color="var(--text-muted)"
                    style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }}
                  />
                  <input
                    id="join-callsign-input"
                    type="text"
                    className="input-base"
                    style={{ paddingLeft: '36px' }}
                    value={joinUserName}
                    onChange={(e) => setJoinUserName(e.target.value)}
                    placeholder="Enter your callsign"
                    required
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="join-squad-code-input"
                  style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '5px' }}
                >
                  SQUAD CODE OR INVITE LINK
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    id="join-squad-code-input"
                    type="text"
                    className="input-base"
                    value={inputSquadId}
                    onChange={(e) => handleInputChange(e.target.value)}
                    placeholder="e.g. SQ-92A4 or paste link"
                    autoFocus
                    required
                  />
                  <button
                    type="button"
                    onClick={handlePasteClipboard}
                    className="btn-secondary"
                    style={{ padding: '0 12px', flexShrink: 0 }}
                    title="Paste from clipboard"
                  >
                    <Clipboard size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowScanner(true)}
                    className="btn-secondary"
                    style={{ padding: '0 12px', flexShrink: 0 }}
                    title="Scan QR Code"
                  >
                    <QrCode size={16} />
                  </button>
                </div>
              </div>

              {feedback && (
                <div
                  style={{
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-xs)',
                    backgroundColor: feedback.isError ? 'var(--accent-red-dim)' : 'var(--accent-cyan-dim)',
                    color: feedback.isError ? 'var(--accent-red)' : 'var(--accent-cyan)',
                    fontSize: '12px'
                  }}
                >
                  {feedback.text}
                </div>
              )}

              <button
                type="submit"
                className="btn-success"
                style={{ width: '100%', padding: '12px', fontSize: '14px', marginTop: '6px' }}
              >
                <span>Connect & Enter Convoy</span>
                <ArrowRight size={16} />
              </button>
            </form>
          </div>
        </div>
      )}

      {/* QR SCANNER MODAL */}
      <QRScannerModal
        isOpen={showScanner}
        onClose={() => setShowScanner(false)}
        onScanSuccess={handleScanSuccess}
      />
    </div>
  );
};
