import React, { useState, useEffect } from 'react';
import {
  Navigation,
  Users,
  MapPin,
  Bell,
  ArrowRight,
  Shield,
  Radio,
  ChevronRight,
  QrCode,
  Clipboard,
  Link2,
  Check,
  User,
  X,
  Share2,
  Sparkles,
  Compass,
  Zap,
  Gauge
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
    title: 'Shared Canonical Route',
    desc: 'The entire convoy follows the exact same designated route chosen by the host to eliminate separation and navigation drift.',
    stat: '100% Path Sync',
    accent: 'var(--accent-cyan)'
  },
  {
    icon: Users,
    title: 'Inter-Member Proximity Radar',
    desc: 'Real-time relative telemetry showing precisely how far ahead or behind each rider is (e.g. "Rahul is +1.8 km ahead").',
    stat: 'Sub-Second Sync',
    accent: 'var(--status-live)'
  },
  {
    icon: Bell,
    title: 'Separation & Lag Alerts',
    desc: 'Intelligent, non-spamming alarms trigger when a vehicle gets held at a traffic signal or drifts past the distance threshold.',
    stat: 'Auto Warning',
    accent: 'var(--status-warning)'
  },
  {
    icon: MapPin,
    title: '"Let\'s Meet Here" Regroup',
    desc: 'Propose meeting points and road-trip pit stops with instantaneous 1-tap squad voting before re-routing together.',
    stat: 'Live Voting',
    accent: 'var(--accent-primary)'
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
      className="page-scroll-container mobile-no-overflow"
      style={{
        width: '100%',
        height: '100%',
        overflowY: 'auto',
        backgroundColor: 'var(--bg-canvas)',
        color: 'var(--text-primary)',
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      <div style={{ padding: '16px 16px 80px', maxWidth: '1080px', margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>
        
        {/* ACTIVE CONVOY RESUME BANNER (if squad active) */}
        {squad && (
          <div
            className="cockpit-card animate-slide-down"
            style={{
              padding: '14px 20px',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '14px',
              border: '1px solid rgba(0, 102, 255, 0.4)',
              background: 'linear-gradient(135deg, rgba(16, 26, 46, 0.95), rgba(10, 15, 29, 0.95))',
              boxShadow: 'var(--shadow-md), 0 0 20px rgba(0, 102, 255, 0.12)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'var(--status-live-dim)',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--status-live)',
                  flexShrink: 0
                }}
              >
                <Radio size={20} className="animate-pulse" />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className="badge badge-green">LIVE CONVOY ACTIVE</span>
                  <span className="font-mono" style={{ fontSize: '12px', color: 'var(--accent-cyan)', fontWeight: 700 }}>
                    ID: {squad.squadId}
                  </span>
                </div>
                <h3 style={{ margin: '3px 0 1px', fontSize: '17px', fontWeight: 800, color: '#FFFFFF' }}>
                  {squad.name || `Trip to ${squad.destination}`}
                </h3>
                <div style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>
                  Traveling to <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{squad.destination}</span> with {members.length} {members.length === 1 ? 'rider' : 'riders'}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                type="button"
                className="btn-secondary"
                onClick={handleCopyActiveInvite}
                style={{ fontSize: '12.5px', padding: '8px 12px' }}
                title="Copy squad invite link"
              >
                {copiedLink ? <Check size={15} color="var(--status-live)" /> : <Share2 size={15} />}
                <span>{copiedLink ? 'Link Copied' : 'Share Code'}</span>
              </button>

              <button
                type="button"
                className="btn-primary"
                onClick={onOpenMap || onStartNavigating}
                style={{ fontSize: '12.5px', padding: '8px 16px' }}
              >
                <Navigation size={14} />
                <span>Resume Journey</span>
              </button>
            </div>
          </div>
        )}

        {/* HERO SECTION */}
        <section style={{ textAlign: 'center', padding: '12px 6px 20px' }}>
          {/* Eyebrow badge */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '5px 14px',
              borderRadius: 'var(--radius-full)',
              backgroundColor: 'rgba(0, 102, 255, 0.1)',
              border: '1px solid rgba(0, 102, 255, 0.3)',
              color: 'var(--accent-cyan)',
              fontSize: '11px',
              fontWeight: 800,
              marginBottom: '16px',
              letterSpacing: '0.6px'
            }}
          >
            <span className="status-beacon-live" />
            <span>REAL-TIME COCKPIT GROUP NAVIGATION</span>
          </div>

          <h1
            style={{
              fontSize: 'clamp(32px, 5.5vw, 52px)',
              fontWeight: 800,
              lineHeight: 1.12,
              letterSpacing: '-1.2px',
              margin: '0 auto 12px',
              maxWidth: '820px',
              color: '#FFFFFF'
            }}
          >
            Every Rider. <br />
            <span style={{
              background: 'linear-gradient(135deg, #00D2FF 0%, #0066FF 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              display: 'inline-block'
            }}>
              One Journey.
            </span>
          </h1>

          <p
            style={{
              fontSize: 'clamp(14px, 1.8vw, 16px)',
              color: 'var(--text-secondary)',
              maxWidth: '640px',
              margin: '0 auto 24px',
              lineHeight: 1.55
            }}
          >
            Coordinate motorcycle tours, sports car rallies, and convoy road trips on a shared canonical path with real-time inter-rider proximity telemetry, automatic separation alerts, and one-tap regroup stops.
          </p>

          {/* Primary Action Deck (Host vs Join) */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))',
              gap: '16px',
              maxWidth: '920px',
              margin: '0 auto 28px',
              textAlign: 'left'
            }}
          >
            {/* Action 1: Start a Squad */}
            <div
              className="cockpit-card"
              style={{
                padding: '24px 22px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                border: '1px solid rgba(0, 102, 255, 0.3)',
                position: 'relative',
                overflow: 'hidden'
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  right: 0,
                  width: '120px',
                  height: '120px',
                  background: 'radial-gradient(circle, rgba(0, 102, 255, 0.15) 0%, transparent 70%)',
                  pointerEvents: 'none'
                }}
              />
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                  <div
                    style={{
                      width: '42px',
                      height: '42px',
                      borderRadius: 'var(--radius-sm)',
                      background: 'linear-gradient(135deg, rgba(0, 102, 255, 0.2), rgba(0, 210, 255, 0.1))',
                      border: '1px solid rgba(0, 102, 255, 0.35)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--accent-cyan)'
                    }}
                  >
                    <Users size={22} />
                  </div>
                  <span className="badge badge-blue">HOST CONVOY</span>
                </div>
                
                <h3 style={{ fontSize: '19px', fontWeight: 800, margin: '0 0 6px', color: '#FFFFFF', letterSpacing: '-0.01em' }}>
                  Start a Squad
                </h3>
                <p style={{ fontSize: '13.5px', color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>
                  Designate a destination, preview vehicle-tailored routes, configure convoy separation limits, and generate an instant invite code.
                </p>
              </div>

              <div style={{ marginTop: '22px' }}>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={onCreateSquad}
                  style={{
                    width: '100%',
                    fontSize: '14px',
                    height: '46px',
                    padding: '0 18px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}
                >
                  <span>Launch New Squad</span>
                  <ArrowRight size={16} />
                </button>
              </div>
            </div>

            {/* Action 2: Join a Squad */}
            <div
              className="cockpit-card"
              style={{
                padding: '24px 22px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                border: '1px solid var(--border-medium)',
                position: 'relative'
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                  <div
                    style={{
                      width: '42px',
                      height: '42px',
                      borderRadius: 'var(--radius-sm)',
                      background: 'rgba(0, 210, 255, 0.12)',
                      border: '1px solid rgba(0, 210, 255, 0.3)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--accent-cyan)'
                    }}
                  >
                    <Link2 size={22} />
                  </div>
                  <span className="badge badge-cyan">JOIN TRIP</span>
                </div>

                <h3 style={{ fontSize: '19px', fontWeight: 800, margin: '0 0 6px', color: '#FFFFFF', letterSpacing: '-0.01em' }}>
                  Join an Existing Squad
                </h3>
                <p style={{ fontSize: '13.5px', color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>
                  Have an invite link or squad code from your road captain? Connect your GPS into the group channel with one tap.
                </p>
              </div>

              <div style={{ marginTop: '22px', display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  className="btn-cyan"
                  onClick={() => setShowJoinModal(true)}
                  style={{
                    flex: 1,
                    fontSize: '14px',
                    height: '46px',
                    padding: '0 16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px'
                  }}
                >
                  <span>Enter Squad Code</span>
                  <ChevronRight size={16} />
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setShowScanner(true)}
                  style={{
                    height: '46px',
                    width: '46px',
                    padding: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}
                  title="Scan Squad QR Code"
                  aria-label="Scan Squad QR Code"
                >
                  <QrCode size={19} color="var(--accent-cyan)" />
                </button>
              </div>
            </div>
          </div>

          {/* Quick Cockpit Telemetry Bar */}
          <div
            style={{
              maxWidth: '860px',
              margin: '0 auto 16px',
              padding: '12px 18px',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'rgba(15, 23, 42, 0.65)',
              border: '1px solid var(--border-subtle)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-around',
              flexWrap: 'wrap',
              gap: '12px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Gauge size={18} color="var(--accent-cyan)" />
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700 }}>SPEED & TELEMETRY</div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>Live GPS Telemetry</div>
              </div>
            </div>

            <div style={{ width: '1px', height: '24px', backgroundColor: 'var(--border-subtle)' }} className="hide-mobile" />

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Compass size={18} color="var(--status-live)" />
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700 }}>CANONICAL PATH</div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>Shared Turn-by-Turn</div>
              </div>
            </div>

            <div style={{ width: '1px', height: '24px', backgroundColor: 'var(--border-subtle)' }} className="hide-mobile" />

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Shield size={18} color="var(--status-warning)" />
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700 }}>SAFETY GUARD</div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>Separation Alarms</div>
              </div>
            </div>
          </div>
        </section>

        {/* CORE CAPABILITIES SECTION */}
        <section style={{ marginTop: '16px' }}>
          <div style={{ textAlign: 'center', marginBottom: '22px' }}>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 800,
                color: 'var(--accent-cyan)',
                textTransform: 'uppercase',
                letterSpacing: '1px'
              }}
            >
              BUILT FOR ROAD TRIPS & MOTORCYCLE CONVOYS
            </span>
            <h2 style={{ fontSize: '28px', fontWeight: 800, margin: '8px 0 0', color: '#FFFFFF' }}>
              Engineered for Convoy Coordination
            </h2>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
              gap: '18px'
            }}
          >
            {BENEFIT_CARDS.map((card, idx) => {
              const Icon = card.icon;
              return (
                <div
                  key={idx}
                  className="surface-card"
                  style={{
                    padding: '24px 20px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-subtle)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                      <div
                        style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: 'var(--radius-sm)',
                          backgroundColor: 'rgba(255, 255, 255, 0.04)',
                          border: '1px solid var(--border-subtle)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: card.accent
                        }}
                      >
                        <Icon size={20} />
                      </div>
                      <span
                        className="font-mono"
                        style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          color: card.accent,
                          backgroundColor: 'rgba(255, 255, 255, 0.04)',
                          padding: '3px 8px',
                          borderRadius: '4px'
                        }}
                      >
                        {card.stat}
                      </span>
                    </div>

                    <h3 style={{ fontSize: '17px', fontWeight: 700, margin: '0 0 8px', color: 'var(--text-primary)' }}>
                      {card.title}
                    </h3>
                    <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.55, margin: 0 }}>
                      {card.desc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      {/* JOIN SQUAD MODAL */}
      {showJoinModal && (
        <div
          className="modal-overlay"
          onClick={() => setShowJoinModal(false)}
        >
          <div
            className="cockpit-card animate-modal-in"
            style={{
              width: '100%',
              maxWidth: '440px',
              padding: '28px 24px',
              position: 'relative',
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-medium)',
              boxShadow: 'var(--shadow-xl)'
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

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
              <div
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'var(--status-live-dim)',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--status-live)'
                }}
              >
                <Link2 size={20} />
              </div>
              <div>
                <h2 style={{ fontSize: '19px', fontWeight: 800, margin: 0, color: '#FFFFFF' }}>Join a Squad</h2>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Connect to an active travel convoy</span>
              </div>
            </div>

            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '0 0 20px', lineHeight: 1.45 }}>
              Enter the 6-character Squad Code or paste the invite link shared by your road leader.
            </p>

            <form onSubmit={handleJoinSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label
                  htmlFor="join-callsign-input"
                  style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', marginBottom: '6px', letterSpacing: '0.4px' }}
                >
                  YOUR PILOT CALLSIGN
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
                    style={{ paddingLeft: '38px' }}
                    value={joinUserName}
                    onChange={(e) => setJoinUserName(e.target.value)}
                    placeholder="Enter your convoy callsign"
                    required
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="join-squad-code-input"
                  style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', marginBottom: '6px', letterSpacing: '0.4px' }}
                >
                  SQUAD CODE OR INVITE URL
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    id="join-squad-code-input"
                    type="text"
                    className="input-base font-mono"
                    value={inputSquadId}
                    onChange={(e) => handleInputChange(e.target.value)}
                    placeholder="e.g. SQ-92A4"
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
                    <QrCode size={16} color="var(--accent-cyan)" />
                  </button>
                </div>
              </div>

              {feedback && (
                <div
                  style={{
                    padding: '9px 12px',
                    borderRadius: 'var(--radius-xs)',
                    backgroundColor: feedback.isError ? 'var(--status-alert-dim)' : 'var(--status-connected-dim)',
                    color: feedback.isError ? 'var(--status-alert)' : 'var(--accent-cyan)',
                    border: `1px solid ${feedback.isError ? 'rgba(239, 68, 68, 0.3)' : 'rgba(0, 210, 255, 0.3)'}`,
                    fontSize: '12px'
                  }}
                >
                  {feedback.text}
                </div>
              )}

              <button
                type="submit"
                className="btn-primary"
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
