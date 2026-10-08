import React from 'react';
import { Shield, Sparkles, X, UserPlus, LogIn, ArrowRight } from 'lucide-react';

interface GuestRestrictionModalProps {
  isOpen: boolean;
  onClose: () => void;
  featureTitle?: string;
  featureDescription?: string;
  onCreateAccount: () => void;
  onLogin: () => void;
  onProceedAsGuest?: () => void;
}

export const GuestRestrictionModal: React.FC<GuestRestrictionModalProps> = ({
  isOpen,
  onClose,
  featureTitle = 'Host a Squad Convoy',
  featureDescription = 'Hosting a squad and managing convoy settings requires a registered SquadMaps account to preserve your route history, squad roster, and regroup checkpoints.',
  onCreateAccount,
  onLogin,
  onProceedAsGuest
}) => {
  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(10, 14, 23, 0.85)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        zIndex: 'var(--z-modal)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px'
      }}
    >
      <div
        className="glass-card animate-fade-in"
        style={{
          width: '100%',
          maxWidth: '440px',
          padding: '28px 24px',
          position: 'relative',
          borderRadius: 'var(--radius-md)',
          boxShadow: 'var(--shadow-lg), 0 0 30px rgba(0, 240, 255, 0.15)',
          border: '1px solid var(--border-medium)',
          backgroundColor: 'var(--bg-glass-card)'
        }}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="btn-icon"
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            width: '32px',
            height: '32px'
          }}
          title="Close"
        >
          <X size={16} />
        </button>

        {/* Header Icon */}
        <div style={{ textAlign: 'center', marginBottom: '16px' }}>
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '16px',
              background: 'linear-gradient(135deg, rgba(0, 240, 255, 0.2), rgba(139, 92, 246, 0.2))',
              border: '1px solid rgba(0, 240, 255, 0.4)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '12px',
              boxShadow: '0 0 20px rgba(0, 240, 255, 0.2)'
            }}
          >
            <Shield size={28} color="var(--accent-cyan)" />
          </div>

          <div
            style={{
              display: 'inline-block',
              padding: '3px 10px',
              borderRadius: '999px',
              backgroundColor: 'rgba(255, 179, 0, 0.15)',
              border: '1px solid rgba(255, 179, 0, 0.3)',
              color: 'var(--accent-amber)',
              fontSize: '11px',
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              marginBottom: '8px'
            }}
          >
            Account Required
          </div>

          <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#FFFFFF', marginBottom: '8px' }}>
            {featureTitle}
          </h2>

          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>
            This feature requires a SquadMaps account. Register now to save your convoys, checkpoints, and custom route history.
          </p>
        </div>

        {/* Benefits List */}
        <div
          style={{
            backgroundColor: 'var(--bg-secondary)',
            borderRadius: 'var(--radius-sm)',
            padding: '14px',
            marginBottom: '20px',
            border: '1px solid var(--border-subtle)',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--text-primary)' }}>
            <Sparkles size={14} color="var(--accent-cyan)" />
            <span>Host multi-member convoys & save squad invites</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--text-primary)' }}>
            <Sparkles size={14} color="var(--accent-green)" />
            <span>Persistent callsign, squad color, and custom avatar</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--text-primary)' }}>
            <Sparkles size={14} color="var(--accent-amber)" />
            <span>Sync live progress across mobile, tablet, and desktop</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <button
            type="button"
            onClick={onCreateAccount}
            className="btn-primary"
            style={{
              width: '100%',
              padding: '13px',
              fontSize: '14px',
              fontWeight: 700,
              borderRadius: 'var(--radius-xs)'
            }}
          >
            <UserPlus size={16} />
            <span>Create Account</span>
            <ArrowRight size={16} style={{ marginLeft: 'auto' }} />
          </button>

          <button
            type="button"
            onClick={onLogin}
            className="btn-secondary"
            style={{
              width: '100%',
              padding: '12px',
              fontSize: '13px',
              fontWeight: 600,
              borderRadius: 'var(--radius-xs)'
            }}
          >
            <LogIn size={15} />
            <span>Log In</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-muted)',
              fontSize: '12px',
              fontWeight: 600,
              padding: '8px',
              cursor: 'pointer',
              textAlign: 'center'
            }}
          >
            Continue Exploring
          </button>
        </div>
      </div>
    </div>
  );
};
