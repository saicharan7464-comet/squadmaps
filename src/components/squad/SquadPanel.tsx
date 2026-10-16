import React, { useState } from 'react';
import { Squad, SquadMember, SquadProgress } from '../../types/squad';
import { SquadMemberCard } from './SquadMemberCard';
import { getInviteUrl } from '../../utils/inviteUrl';
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
  MessageSquare,
  Radio
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
  onOpenChat?: () => void;
  hasUnreadMessages?: boolean;
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
  onOpenSettings,
  onOpenChat,
  hasUnreadMessages = false
}) => {
  const [copied, setCopied] = useState(false);

  const inviteUrl = getInviteUrl(squad.squadId);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleWhatsAppShare = () => {
    const text = encodeURIComponent(
      `🚗 Join our Squad on SquadMaps for our trip to ${squad.destination}!\n\nTap to join & track our convoy: ${inviteUrl}`
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
        gap: '14px',
        padding: '16px',
        boxSizing: 'border-box'
      }}
    >
      {/* Squad Header Card */}
      <div className="cockpit-card" style={{ padding: '16px 18px', backgroundColor: 'var(--bg-surface)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span
                className="font-mono"
                style={{
                  fontSize: '11px',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  color: 'var(--accent-cyan)',
                  letterSpacing: '0.8px'
                }}
              >
                SQUAD #{squad.squadId}
              </span>
              <span style={{ fontSize: '12px', color: 'var(--border-medium)' }}>•</span>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                Host: <strong style={{ color: 'var(--text-primary)' }}>{squad.hostName}</strong>
              </span>
            </div>
            <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#FFFFFF', marginTop: '3px', margin: '3px 0 0' }}>
              {squad.name || `Trip to ${squad.destination}`}
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
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {squad.destination}
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {onOpenChat && (
              <button
                className="btn-icon"
                onClick={onOpenChat}
                title="Squad Chat Radio"
                style={{ width: '36px', height: '36px', position: 'relative' }}
              >
                <MessageSquare size={17} color="var(--accent-cyan)" />
                {hasUnreadMessages && (
                  <span
                    style={{
                      position: 'absolute',
                      top: '5px',
                      right: '5px',
                      width: '7px',
                      height: '7px',
                      borderRadius: '50%',
                      backgroundColor: 'var(--status-live)'
                    }}
                  />
                )}
              </button>
            )}

            {isHost && onOpenSettings && (
              <button className="btn-icon" onClick={onOpenSettings} title="Host Settings" style={{ width: '36px', height: '36px' }}>
                <Settings size={17} />
              </button>
            )}
          </div>
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
            <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 700 }}>TOTAL</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div className="font-mono text-green" style={{ fontSize: '18px', fontWeight: 800 }}>
              {squadProgress.arrivedCount}
            </div>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 700 }}>ARRIVED</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div className="font-mono text-blue" style={{ fontSize: '18px', fontWeight: 800 }}>
              {squadProgress.enRouteCount}
            </div>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 700 }}>ON TRACK</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div
              className="font-mono"
              style={{
                fontSize: '18px',
                fontWeight: 800,
                color: squadProgress.behindCount > 0 ? 'var(--status-alert)' : 'var(--text-muted)'
              }}
            >
              {squadProgress.behindCount}
            </div>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 700 }}>BEHIND</div>
          </div>
        </div>

        {/* Action Buttons: Share & Invite */}
        <div style={{ display: 'flex', gap: '8px', marginTop: '14px' }}>
          <button
            className="btn-secondary"
            onClick={handleCopyLink}
            style={{ flex: 1, padding: '8px 12px', fontSize: '12px' }}
          >
            {copied ? <Check size={15} color="var(--status-live)" /> : <Copy size={15} />}
            <span>{copied ? 'Copied!' : 'Copy Link'}</span>
          </button>

          <button
            className="btn-secondary"
            onClick={handleWhatsAppShare}
            style={{
              flex: 1,
              padding: '8px 12px',
              fontSize: '12px',
              backgroundColor: 'rgba(37, 211, 102, 0.1)',
              borderColor: 'rgba(37, 211, 102, 0.3)',
              color: '#25D366'
            }}
          >
            <Share2 size={15} />
            <span>WhatsApp</span>
          </button>
        </div>
      </div>

      {/* Regroup & Privacy Bar */}
      <div style={{ display: 'flex', gap: '8px' }}>
        <button
          type="button"
          className="btn-secondary"
          onClick={onProposeRegroup}
          style={{
            flex: 1,
            backgroundColor: 'var(--status-warning-dim)',
            borderColor: 'rgba(245, 158, 11, 0.35)',
            color: 'var(--status-warning)',
            fontSize: '12px',
            padding: '10px 12px',
            fontWeight: 700
          }}
        >
          <MapPin size={15} />
          <span>Let's Meet Here</span>
        </button>

        <button
          type="button"
          className="btn-secondary"
          onClick={onToggleSharing}
          title="Pause or resume sharing your live GPS location"
          style={{
            flex: 1,
            fontSize: '12px',
            padding: '10px 12px',
            borderColor: isSharingPaused ? 'var(--status-warning)' : 'var(--border-medium)',
            color: isSharingPaused ? 'var(--status-warning)' : 'var(--text-secondary)',
            fontWeight: 700
          }}
        >
          {isSharingPaused ? <EyeOff size={15} /> : <Eye size={15} />}
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span className="status-beacon-live" />
            <h3 style={{ fontSize: '12px', fontWeight: 800, color: 'var(--text-secondary)', letterSpacing: '0.5px', textTransform: 'uppercase', margin: 0 }}>
              SQUAD ROSTER ({members.length})
            </h3>
          </div>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>Live Telemetry</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
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
