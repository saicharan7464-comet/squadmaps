import React, { useState } from 'react';
import { Squad, SquadMember } from '../../types/squad';
import { QRCodeSVG } from 'qrcode.react';
import { Settings, X, Edit3, Trash2, AlertOctagon, UserX, Share2, Copy, Check } from 'lucide-react';

interface HostSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  squad: Squad;
  members: SquadMember[];
  currentUserId: string;
  onRenameSquad: (name: string) => void;
  onRemoveMember: (userId: string) => void;
  onEndSquad: () => void;
}

export const HostSettingsModal: React.FC<HostSettingsModalProps> = ({
  isOpen,
  onClose,
  squad,
  members,
  currentUserId,
  onRenameSquad,
  onRemoveMember,
  onEndSquad
}) => {
  const [squadName, setSquadName] = useState(squad.name);
  const [copied, setCopied] = useState(false);
  const [confirmEnd, setConfirmEnd] = useState(false);

  if (!isOpen) return null;

  const inviteUrl = `${window.location.origin}/join/${squad.squadId}`;

  const handleRename = (e: React.FormEvent) => {
    e.preventDefault();
    if (squadName.trim() && squadName !== squad.name) {
      onRenameSquad(squadName.trim());
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
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
      onClick={onClose}
    >
      <div
        className="glass-panel animate-fade-in"
        style={{
          width: '100%',
          maxWidth: '520px',
          maxHeight: '90vh',
          overflowY: 'auto',
          padding: '24px',
          backgroundColor: 'var(--bg-secondary)',
          border: '1px solid var(--border-medium)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Settings size={22} color="var(--accent-cyan)" />
            <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#FFFFFF' }}>Squad Host Controls</h3>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', color: 'var(--text-muted)' }}>
            <X size={20} />
          </button>
        </div>

        {/* Rename Squad */}
        <form onSubmit={handleRename} style={{ marginBottom: '20px' }}>
          <label style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
            Squad Name
          </label>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              type="text"
              value={squadName}
              onChange={(e) => setSquadName(e.target.value)}
              style={{
                flex: 1,
                padding: '10px 14px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'var(--bg-card)',
                border: '1px solid var(--border-medium)',
                color: '#FFFFFF',
                fontSize: '14px',
                outline: 'none'
              }}
            />
            <button
              type="submit"
              disabled={squadName === squad.name}
              className="btn-primary"
              style={{ padding: '10px 16px', fontSize: '13px' }}
            >
              Save
            </button>
          </div>
        </form>

        {/* QR Code & Shareable Invitation */}
        <div
          className="glass-card"
          style={{
            padding: '16px',
            marginBottom: '20px',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center'
          }}
        >
          <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '12px' }}>
            Scan QR Code to Join Squad
          </div>
          <div style={{ background: '#FFFFFF', padding: '12px', borderRadius: '12px', display: 'inline-block' }}>
            <QRCodeSVG value={inviteUrl} size={150} level="M" />
          </div>
          <div style={{ fontSize: '12px', color: 'var(--accent-cyan)', fontWeight: 700, marginTop: '10px' }}>
            {inviteUrl}
          </div>
          <button
            onClick={handleCopyLink}
            className="btn-secondary"
            style={{ marginTop: '10px', fontSize: '12px', padding: '6px 14px' }}
          >
            {copied ? <Check size={14} color="var(--accent-green)" /> : <Copy size={14} />}
            <span>{copied ? 'Copied' : 'Copy Invitation Link'}</span>
          </button>
        </div>

        {/* Manage Members */}
        <div style={{ marginBottom: '24px' }}>
          <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '10px' }}>
            Manage Members ({members.length})
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {members.map((m) => (
              <div
                key={m.userId}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 12px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'var(--bg-card)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <img
                    src={m.profileImage}
                    alt={m.name}
                    style={{ width: '32px', height: '32px', borderRadius: '50%' }}
                  />
                  <span style={{ fontSize: '14px', fontWeight: 600, color: '#FFFFFF' }}>
                    {m.name} {m.isHost && '(Host)'}
                  </span>
                </div>

                {!m.isHost && m.userId !== currentUserId && (
                  <button
                    onClick={() => onRemoveMember(m.userId)}
                    title="Remove member from squad"
                    style={{
                      background: 'rgba(255, 61, 113, 0.15)',
                      color: 'var(--accent-red)',
                      padding: '6px 10px',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: 600
                    }}
                  >
                    <UserX size={14} />
                    <span>Remove</span>
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* End Squad Session */}
        <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '16px' }}>
          {!confirmEnd ? (
            <button
              onClick={() => setConfirmEnd(true)}
              className="btn-secondary"
              style={{
                width: '100%',
                backgroundColor: 'rgba(255, 61, 113, 0.12)',
                borderColor: 'var(--accent-red)',
                color: 'var(--accent-red)'
              }}
            >
              <AlertOctagon size={18} />
              <span>End Squad Session</span>
            </button>
          ) : (
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: '13px', color: 'var(--accent-red)', marginBottom: '10px' }}>
                Are you sure you want to end this squad? All members will be disconnected.
              </p>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={onEndSquad}
                  className="btn-primary"
                  style={{ flex: 1, backgroundColor: 'var(--accent-red)', color: '#FFFFFF' }}
                >
                  Yes, End Squad
                </button>
                <button
                  onClick={() => setConfirmEnd(false)}
                  className="btn-secondary"
                  style={{ flex: 1 }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
