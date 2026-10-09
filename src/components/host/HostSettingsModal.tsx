import React, { useState } from 'react';
import { Squad, SquadMember } from '../../types/squad';
import { QRCodeSVG } from 'qrcode.react';
import { getInviteUrl } from '../../utils/inviteUrl';
import { Settings, X, Edit3, Trash2, AlertOctagon, UserX, Share2, Copy, Check } from 'lucide-react';

interface HostSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  squad: Squad;
  members: SquadMember[];
  currentUserId: string;
  onRenameSquad: (name: string) => void;
  onRemoveMember: (userId: string) => void;
  onEndSquad: () => void | Promise<void>;
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
  const [isEnding, setIsEnding] = useState(false);

  const handleEndSquad = async () => {
    setIsEnding(true);
    try {
      await onEndSquad();
      onClose();
    } catch (err) {
      console.error('Failed to end squad session:', err);
    } finally {
      setIsEnding(false);
      setConfirmEnd(false);
    }
  };

  if (!isOpen) return null;

  const inviteUrl = getInviteUrl(squad.squadId);

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
        backgroundColor: 'rgba(8, 13, 22, 0.82)',
        backdropFilter: 'blur(10px)',
        zIndex: 'var(--z-modal)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px'
      }}
      onClick={onClose}
    >
      <div
        className="surface-card animate-fade-in"
        style={{
          width: '100%',
          maxWidth: '520px',
          maxHeight: '90vh',
          overflowY: 'auto',
          padding: '24px',
          boxShadow: 'var(--shadow-xl)'
        }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="host-controls-title"
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'rgba(0, 217, 232, 0.12)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Settings size={20} color="var(--accent-cyan)" />
            </div>
            <div>
              <h3 id="host-controls-title" style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                Squad Host Controls
              </h3>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                Manage convoy settings and members
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="btn-icon"
            aria-label="Close host controls"
            style={{ width: '34px', height: '34px', color: 'var(--text-secondary)' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Rename Squad */}
        <form onSubmit={handleRename} style={{ marginBottom: '20px' }}>
          <label
            htmlFor="host-squad-name"
            style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}
          >
            Squad Name
          </label>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              id="host-squad-name"
              type="text"
              value={squadName}
              onChange={(e) => setSquadName(e.target.value)}
              className="input-base"
              style={{
                flex: 1,
                fontSize: '14px'
              }}
            />
            <button
              type="submit"
              disabled={squadName === squad.name}
              className="btn-primary"
              style={{ padding: '10px 16px', fontSize: '13px', flexShrink: 0 }}
            >
              Save
            </button>
          </div>
        </form>

        {/* QR Code & Shareable Invitation */}
        <div
          className="elevated-card"
          style={{
            padding: '18px',
            marginBottom: '20px',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            border: '1px solid var(--border-subtle)'
          }}
        >
          <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '12px' }}>
            Scan QR Code to Join Convoy
          </div>
          <div style={{ background: '#FFFFFF', padding: '12px', borderRadius: 'var(--radius-md)', display: 'inline-block' }}>
            <QRCodeSVG value={inviteUrl} size={150} level="M" />
          </div>
          <div style={{ fontSize: '12px', color: 'var(--accent-cyan)', fontWeight: 700, marginTop: '10px', wordBreak: 'break-all' }}>
            {inviteUrl}
          </div>
          <button
            type="button"
            onClick={handleCopyLink}
            className="btn-secondary"
            style={{ marginTop: '12px', fontSize: '12px', padding: '8px 16px' }}
          >
            {copied ? <Check size={14} color="var(--accent-green)" /> : <Copy size={14} />}
            <span>{copied ? 'Copied' : 'Copy Invitation Link'}</span>
          </button>
        </div>

        {/* Manage Members */}
        <div style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-secondary)' }}>
              Convoy Members ({members.length})
            </span>
            <span className="badge badge-cyan" style={{ fontSize: '10px' }}>
              Host Privileges
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {members.map((m) => (
              <div
                key={m.userId}
                className="elevated-card"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 14px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <img
                    src={m.profileImage}
                    alt={m.name}
                    style={{ width: '32px', height: '32px', borderRadius: '50%', border: '1.5px solid var(--border-medium)' }}
                  />
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {m.name}
                    </span>
                    {m.isHost && (
                      <span className="badge badge-cyan" style={{ fontSize: '9px', padding: '2px 6px' }}>
                        HOST
                      </span>
                    )}
                  </div>
                </div>

                {!m.isHost && m.userId !== currentUserId && (
                  <button
                    type="button"
                    onClick={() => onRemoveMember(m.userId)}
                    title="Remove member from squad"
                    className="btn-ghost"
                    style={{
                      color: 'var(--accent-red)',
                      padding: '6px 10px',
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
              type="button"
              onClick={() => setConfirmEnd(true)}
              className="btn-secondary"
              style={{
                width: '100%',
                backgroundColor: 'rgba(239, 68, 68, 0.08)',
                borderColor: 'rgba(239, 68, 68, 0.3)',
                color: 'var(--accent-red)',
                padding: '12px'
              }}
            >
              <AlertOctagon size={18} />
              <span>End Squad Session</span>
            </button>
          ) : (
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: '13px', color: 'var(--accent-red)', marginBottom: '12px' }}>
                Are you sure you want to end this squad? All members will be disconnected.
              </p>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  onClick={handleEndSquad}
                  disabled={isEnding}
                  className="btn-primary"
                  style={{ flex: 1, backgroundColor: 'var(--accent-red)', color: '#FFFFFF' }}
                >
                  {isEnding ? 'Ending Squad...' : 'Yes, End Squad'}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmEnd(false)}
                  disabled={isEnding}
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
