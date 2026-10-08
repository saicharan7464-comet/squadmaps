import React, { useState } from 'react';
import {
  X,
  User,
  Mail,
  Shield,
  Sparkles,
  LogOut,
  UserPlus,
  Edit2,
  Check,
  Calendar,
  Hash
} from 'lucide-react';
import { useAuth } from '../../features/auth/AuthContext';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTriggerUpgrade?: () => void;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  isOpen,
  onClose,
  onTriggerUpgrade
}) => {
  const { user, isGuest, logout, updateProfileName } = useAuth();
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState(user?.name || '');
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  if (!isOpen || !user) return null;

  const handleSaveName = () => {
    if (editedName.trim()) {
      updateProfileName(editedName.trim());
    }
    setIsEditingName(false);
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
      onClose();
    } finally {
      setIsLoggingOut(false);
    }
  };

  const formattedDate = user.createdAt
    ? new Date(user.createdAt).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      })
    : 'Recent';

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
          maxWidth: '420px',
          padding: '28px 24px',
          position: 'relative',
          borderRadius: 'var(--radius-md)',
          boxShadow: 'var(--shadow-lg), 0 0 30px rgba(0, 240, 255, 0.12)',
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

        {/* Profile Card Header */}
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <div style={{ position: 'relative', display: 'inline-block', marginBottom: '12px' }}>
            <img
              src={user.avatar}
              alt={user.name}
              style={{
                width: '72px',
                height: '72px',
                borderRadius: '50%',
                border: `3px solid ${user.color || 'var(--accent-cyan)'}`,
                boxShadow: `0 0 20px ${user.color || 'var(--accent-cyan)'}40`,
                backgroundColor: 'var(--bg-secondary)',
                objectFit: 'cover'
              }}
            />
            <div
              style={{
                position: 'absolute',
                bottom: '2px',
                right: '2px',
                width: '16px',
                height: '16px',
                borderRadius: '50%',
                backgroundColor: isGuest ? 'var(--accent-amber)' : 'var(--accent-green)',
                border: '2px solid var(--bg-primary)'
              }}
              title={isGuest ? 'Guest Session' : 'Verified Member'}
            />
          </div>

          {/* Callsign / Name */}
          {isEditingName ? (
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', alignItems: 'center', marginBottom: '8px' }}>
              <input
                type="text"
                value={editedName}
                onChange={(e) => setEditedName(e.target.value)}
                autoFocus
                style={{
                  padding: '6px 12px',
                  borderRadius: 'var(--radius-xs)',
                  backgroundColor: 'var(--bg-secondary)',
                  border: '1px solid var(--accent-cyan)',
                  color: '#FFFFFF',
                  fontSize: '16px',
                  fontWeight: 700,
                  textAlign: 'center',
                  outline: 'none',
                  maxWidth: '200px'
                }}
              />
              <button
                type="button"
                onClick={handleSaveName}
                className="btn-primary"
                style={{ padding: '7px 12px', borderRadius: 'var(--radius-xs)' }}
              >
                <Check size={14} />
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', marginBottom: '6px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#FFFFFF', margin: 0 }}>
                {user.name}
              </h2>
              <button
                type="button"
                onClick={() => {
                  setEditedName(user.name);
                  setIsEditingName(true);
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  padding: '4px'
                }}
                title="Edit Callsign"
              >
                <Edit2 size={14} />
              </button>
            </div>
          )}

          {/* Account Status Badge */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '3px 12px',
              borderRadius: '999px',
              backgroundColor: isGuest ? 'rgba(255, 179, 0, 0.15)' : 'rgba(0, 240, 255, 0.15)',
              border: `1px solid ${isGuest ? 'rgba(255, 179, 0, 0.35)' : 'rgba(0, 240, 255, 0.35)'}`,
              color: isGuest ? 'var(--accent-amber)' : 'var(--accent-cyan)',
              fontSize: '11px',
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}
          >
            {isGuest ? (
              <>
                <Shield size={12} />
                <span>Guest Explorer</span>
              </>
            ) : (
              <>
                <Sparkles size={12} />
                <span>SquadMaps Member</span>
              </>
            )}
          </div>
        </div>

        {/* Account Details Box */}
        <div
          style={{
            backgroundColor: 'var(--bg-secondary)',
            borderRadius: 'var(--radius-sm)',
            padding: '14px 16px',
            marginBottom: '18px',
            border: '1px solid var(--border-subtle)',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px'
          }}
        >
          {user.email ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px' }}>
              <Mail size={16} color="var(--accent-cyan)" />
              <span style={{ color: 'var(--text-secondary)' }}>Email:</span>
              <span style={{ color: '#FFFFFF', marginLeft: 'auto', fontWeight: 600 }}>{user.email}</span>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px' }}>
              <Shield size={16} color="var(--accent-amber)" />
              <span style={{ color: 'var(--text-secondary)' }}>Status:</span>
              <span style={{ color: 'var(--accent-amber)', marginLeft: 'auto', fontWeight: 600 }}>Temporary Session</span>
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px' }}>
            <Calendar size={16} color="var(--accent-green)" />
            <span style={{ color: 'var(--text-secondary)' }}>Active Since:</span>
            <span style={{ color: '#FFFFFF', marginLeft: 'auto', fontWeight: 600 }}>{formattedDate}</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px' }}>
            <Hash size={16} color="var(--accent-purple)" />
            <span style={{ color: 'var(--text-secondary)' }}>Session ID:</span>
            <span
              className="font-mono"
              style={{
                color: 'var(--text-muted)',
                marginLeft: 'auto',
                fontSize: '11px'
              }}
            >
              {user.id.substring(0, 14)}...
            </span>
          </div>
        </div>

        {/* Guest Upgrade Banner */}
        {isGuest && (
          <div
            style={{
              padding: '12px 14px',
              backgroundColor: 'rgba(0, 240, 255, 0.08)',
              border: '1px solid rgba(0, 240, 255, 0.25)',
              borderRadius: 'var(--radius-sm)',
              marginBottom: '18px'
            }}
          >
            <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--accent-cyan)', marginBottom: '4px' }}>
              Want to keep your trips?
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '10px', lineHeight: 1.4 }}>
              Registering migrates your current guest session, saved squads, and vehicle preferences permanently.
            </div>
            <button
              type="button"
              onClick={() => {
                onClose();
                if (onTriggerUpgrade) onTriggerUpgrade();
              }}
              className="btn-primary"
              style={{
                width: '100%',
                padding: '10px',
                fontSize: '13px',
                borderRadius: 'var(--radius-xs)'
              }}
            >
              <UserPlus size={15} />
              <span>Create Permanent Account</span>
            </button>
          </div>
        )}

        {/* Logout Action */}
        <button
          type="button"
          onClick={handleLogout}
          disabled={isLoggingOut}
          className="btn-secondary"
          style={{
            width: '100%',
            padding: '12px',
            fontSize: '13px',
            borderRadius: 'var(--radius-xs)',
            borderColor: 'rgba(255, 61, 113, 0.3)',
            color: 'var(--accent-red)'
          }}
        >
          <LogOut size={15} />
          <span>{isGuest ? 'Exit Guest Session' : 'Log Out of SquadMaps'}</span>
        </button>
      </div>
    </div>
  );
};
