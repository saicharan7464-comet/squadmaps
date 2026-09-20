import React, { useState } from 'react';
import { Squad, SquadMember, SquadProgress } from '../../types/squad';
import { SquadMemberCard } from './SquadMemberCard';
import {
  Users,
  Share2,
  Copy,
  Check,
  Flag,
  MapPin,
  Eye,
  EyeOff,
  Settings,
  X,
  MessageCircle,
  HelpCircle
} from 'lucide-react';

interface SquadPanelProps {
  squad: Squad;
  members: SquadMember[];
  squadProgress: SquadProgress;
  currentUserId: string;
  isHost: boolean;
  isSharingPaused: boolean;
  onToggleSharing: () => void;
  onLocateMember: (member: SquadMember) => void;
  onProposeRegroup: () => void;
  onOpenSettings?: () => void;
}

export const SquadPanel: React.FC<SquadPanelProps> = ({
  squad,
  members,
  squadProgress,
  currentUserId,
  isHost,
  isSharingPaused,
  onToggleSharing,
  onLocateMember,
  onProposeRegroup,
  onOpenSettings
}) => {
  const [copied, setCopied] = useState(false);

  const inviteUrl = `${window.location.origin}/join/${squad.squadId}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleWhatsAppShare = () => {
    const text = encodeURIComponent(
      `🚗 Join my Squad on SquadNav for our trip to ${squad.destination}!\n\nTap to join & track our convoy: ${inviteUrl}`
    );
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        overflowY: 'auto',
        gap: '16px',
        padding: '16px'
      }}
    >
      {/* Squad Header */}
      <div className="glass-card" style={{ padding: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  color: 'var(--accent-cyan)',
                  letterSpacing: '1px'
                }}
              >
                SQUAD #{squad.squadId}
              </span>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>•</span>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                Host: {squad.hostName}
              </span>
            </div>
            <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#FFFFFF', marginTop: '2px' }}>
              {squad.name}
            </h2>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                marginTop: '4px',
                color: 'var(--text-secondary)',
                fontSize: '13px'
              }}
            >
              <Flag size={14} color="var(--accent-cyan)" />
              <span>Destination: <strong>{squad.destination}</strong></span>
            </div>
          </div>

          {isHost && onOpenSettings && (
            <button className="btn-icon" onClick={onOpenSettings} title="Squad Settings" style={{ width: '36px', height: '36px' }}>
              <Settings size={18} />
            </button>
          )}
        </div>

        {/* Progress Summary Chips */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '8px',
            marginTop: '16px',
            paddingTop: '12px',
            borderTop: '1px solid var(--border-subtle)'
          }}
        >
          <div style={{ textAlign: 'center' }}>
            <div className="font-mono text-cyan" style={{ fontSize: '18px', fontWeight: 800 }}>
              {squadProgress.totalMembers}
            </div>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 600 }}>Total</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div className="font-mono text-green" style={{ fontSize: '18px', fontWeight: 800 }}>
              {squadProgress.arrivedCount}
            </div>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 600 }}>Arrived</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div className="font-mono text-cyan" style={{ fontSize: '18px', fontWeight: 800 }}>
              {squadProgress.enRouteCount}
            </div>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 600 }}>On Track</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div
              className="font-mono"
              style={{
                fontSize: '18px',
                fontWeight: 800,
                color: squadProgress.behindCount > 0 ? 'var(--accent-red)' : 'var(--text-muted)'
              }}
            >
              {squadProgress.behindCount}
            </div>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 600 }}>Behind</div>
          </div>
        </div>

        {/* Action Buttons: Share & Regroup */}
        <div style={{ display: 'flex', gap: '8px', marginTop: '14px' }}>
          <button
            className="btn-secondary"
            onClick={handleCopyLink}
            style={{ flex: 1, padding: '9px 12px', fontSize: '13px' }}
          >
            {copied ? <Check size={16} color="var(--accent-green)" /> : <Copy size={16} />}
            <span>{copied ? 'Copied!' : 'Copy Link'}</span>
          </button>

          <button
            className="btn-secondary"
            onClick={handleWhatsAppShare}
            style={{
              flex: 1,
              padding: '9px 12px',
              fontSize: '13px',
              backgroundColor: 'rgba(37, 211, 102, 0.12)',
              borderColor: 'rgba(37, 211, 102, 0.4)',
              color: '#25D366'
            }}
          >
            <Share2 size={16} />
            <span>WhatsApp</span>
          </button>
        </div>
      </div>

      {/* Regroup & Privacy Bar */}
      <div style={{ display: 'flex', gap: '8px' }}>
        <button
          className="btn-primary"
          onClick={onProposeRegroup}
          style={{
            flex: 1,
            background: 'linear-gradient(135deg, #FFB300, #FF8F00)',
            color: '#0A0E17',
            fontSize: '13px',
            padding: '10px 14px'
          }}
        >
          <MapPin size={16} />
          <span>Let's Meet Here</span>
        </button>

        <button
          className="btn-secondary"
          onClick={onToggleSharing}
          title="Pause or resume sharing your live GPS location"
          style={{
            flex: 1,
            fontSize: '13px',
            padding: '10px 14px',
            borderColor: isSharingPaused ? 'var(--accent-amber)' : 'var(--border-subtle)',
            color: isSharingPaused ? 'var(--accent-amber)' : 'var(--text-primary)'
          }}
        >
          {isSharingPaused ? <EyeOff size={16} /> : <Eye size={16} />}
          <span>{isSharingPaused ? 'Resume GPS' : 'Pause GPS'}</span>
        </button>
      </div>

      {/* Members List */}
      <div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '10px'
          }}
        >
          <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-secondary)' }}>
            SQUAD MEMBERS ({members.length})
          </h3>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Live GPS</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {members.map((member) => (
            <SquadMemberCard
              key={member.userId}
              member={member}
              isCurrentUser={member.userId === currentUserId}
              onLocate={onLocateMember}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
