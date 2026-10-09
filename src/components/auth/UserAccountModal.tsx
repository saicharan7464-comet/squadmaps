import React, { useState } from 'react';
import { useAuth } from '../../features/auth/AuthContext';
import {
  User,
  Shield,
  Zap,
  Mail,
  Lock,
  Eye,
  EyeOff,
  LogOut,
  Edit2,
  Check,
  X,
  AlertCircle,
  RefreshCw,
  Compass
} from 'lucide-react';

interface UserAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const UserAccountModal: React.FC<UserAccountModalProps> = ({ isOpen, onClose }) => {
  const {
    user,
    updateProfileName,
    loginWithEmail,
    registerWithEmail,
    logout,
    loginAsGuest
  } = useAuth();

  const [mode, setMode] = useState<'profile' | 'login' | 'signup'>('profile');
  const [editingName, setEditingName] = useState(false);
  const [callsignInput, setCallsignInput] = useState(user?.name || '');

  // Auth form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [signupName, setSignupName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSaveCallsign = () => {
    if (callsignInput.trim()) {
      updateProfileName(callsignInput.trim());
      setEditingName(false);
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setError('Please enter your email address.');
      return;
    }
    if (!password) {
      setError('Please enter your password.');
      return;
    }

    setIsLoading(true);
    try {
      await loginWithEmail(cleanEmail, password);
      setSuccess('Logged in successfully!');
      setPassword('');
      setTimeout(() => {
        setMode('profile');
        setSuccess(null);
      }, 1000);
    } catch (err: any) {
      setError(err?.message || 'Invalid email or password.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const cleanName = signupName.trim() || user?.name || '';
    const cleanEmail = email.trim();

    if (!cleanName) {
      setError('Please enter your squad callsign.');
      return;
    }
    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setError('Please enter a valid email address.');
      return;
    }
    if (!password || password.length < 8) {
      setError('Password must contain at least 8 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsLoading(true);
    try {
      await registerWithEmail(cleanEmail, password, cleanName);
      setSuccess('Account created successfully!');
      setPassword('');
      setConfirmPassword('');
      setTimeout(() => {
        setMode('profile');
        setSuccess(null);
      }, 1000);
    } catch (err: any) {
      setError(err?.message || 'Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      onClose();
    } catch (err) {
      console.warn('Logout failed:', err);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        backgroundColor: 'rgba(8, 13, 22, 0.85)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px'
      }}
      onClick={onClose}
    >
      <div
        className="surface-card animate-scale-in"
        style={{
          width: '100%',
          maxWidth: '420px',
          padding: '24px',
          position: 'relative',
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border-medium)',
          boxShadow: 'var(--shadow-elevated)'
        }}
        onClick={(e) => e.stopPropagation()}
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
          title="Close modal"
          aria-label="Close"
        >
          <X size={16} />
        </button>

        {/* PROFILE OVERVIEW MODE */}
        {mode === 'profile' && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '20px' }}>
              <div
                style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '50%',
                  backgroundColor: user?.color || 'var(--accent-cyan)',
                  padding: '2px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  boxShadow: '0 0 16px rgba(0, 217, 232, 0.2)'
                }}
              >
                <img
                  src={user?.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${user?.id || 'pilot'}`}
                  alt={user?.name || 'Pilot'}
                  style={{ width: '100%', height: '100%', borderRadius: '50%', backgroundColor: '#101827' }}
                />
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                {editingName ? (
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    <input
                      type="text"
                      className="input-base"
                      value={callsignInput}
                      onChange={(e) => setCallsignInput(e.target.value)}
                      placeholder="Your squad callsign"
                      autoFocus
                      maxLength={24}
                      style={{ padding: '6px 10px', fontSize: '14px' }}
                    />
                    <button
                      type="button"
                      className="btn-primary"
                      onClick={handleSaveCallsign}
                      style={{ padding: '6px 10px' }}
                      title="Save callsign"
                    >
                      <Check size={14} />
                    </button>
                    <button
                      type="button"
                      className="btn-ghost"
                      onClick={() => {
                        setCallsignInput(user?.name || '');
                        setEditingName(false);
                      }}
                      style={{ padding: '6px 8px' }}
                      title="Cancel"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <h2
                      style={{
                        fontSize: '18px',
                        fontWeight: 800,
                        color: 'var(--text-primary)',
                        margin: 0,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {user?.name || 'Squad Member'}
                    </h2>
                    <button
                      type="button"
                      className="btn-ghost"
                      onClick={() => {
                        setCallsignInput(user?.name || '');
                        setEditingName(true);
                      }}
                      style={{ padding: '4px', borderRadius: '4px' }}
                      title="Edit callsign"
                      aria-label="Edit callsign"
                    >
                      <Edit2 size={13} color="var(--accent-cyan)" />
                    </button>
                  </div>
                )}

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
                  {user?.isGuest ? (
                    <span className="badge badge-amber">
                      <Zap size={11} /> Guest Pilot
                    </span>
                  ) : (
                    <span className="badge badge-green">
                      <Shield size={11} /> Registered
                    </span>
                  )}
                  {user?.email && (
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      {user.email}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Guest Upgrade / Sign In Prompt */}
            {user?.isGuest && (
              <div
                style={{
                  padding: '14px',
                  backgroundColor: 'var(--bg-elevated)',
                  border: '1px solid var(--border-medium)',
                  borderRadius: 'var(--radius-sm)',
                  marginBottom: '20px'
                }}
              >
                <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>
                  Save your journey history
                </div>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '0 0 12px', lineHeight: 1.4 }}>
                  You are currently exploring as a Guest. Create a registered account to sync squad journeys across devices.
                </p>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    className="btn-primary"
                    style={{ flex: 1, padding: '8px 12px', fontSize: '13px' }}
                    onClick={() => {
                      setMode('signup');
                      setError(null);
                    }}
                  >
                    <span>Create Account</span>
                  </button>
                  <button
                    type="button"
                    className="btn-secondary"
                    style={{ flex: 1, padding: '8px 12px', fontSize: '13px' }}
                    onClick={() => {
                      setMode('login');
                      setError(null);
                    }}
                  >
                    <span>Sign In</span>
                  </button>
                </div>
              </div>
            )}

            {/* Logout Action */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '10px', borderTop: '1px solid var(--border-subtle)' }}>
              <button
                type="button"
                className="btn-ghost"
                onClick={handleLogout}
                style={{ fontSize: '13px', color: 'var(--accent-red)', padding: '6px 10px' }}
              >
                <LogOut size={14} />
                <span>Reset Session / Sign Out</span>
              </button>
            </div>
          </div>
        )}

        {/* LOGIN FORM MODE */}
        {mode === 'login' && (
          <form onSubmit={handleLoginSubmit}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <button
                type="button"
                className="btn-ghost"
                onClick={() => setMode('profile')}
                style={{ padding: '4px 8px', fontSize: '12px' }}
              >
                ← Back
              </button>
              <h2 style={{ fontSize: '16px', fontWeight: 800, margin: 0 }}>Sign In to SquadMaps</h2>
            </div>

            {error && (
              <div
                style={{
                  padding: '10px 12px',
                  backgroundColor: 'var(--accent-red-dim)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  borderRadius: 'var(--radius-xs)',
                  color: 'var(--accent-red)',
                  fontSize: '12px',
                  marginBottom: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <AlertCircle size={15} />
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div
                style={{
                  padding: '10px 12px',
                  backgroundColor: 'var(--accent-green-dim)',
                  border: '1px solid rgba(0, 214, 160, 0.3)',
                  borderRadius: 'var(--radius-xs)',
                  color: 'var(--accent-green)',
                  fontSize: '12px',
                  marginBottom: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <Check size={15} />
                <span>{success}</span>
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '18px' }}>
              <div>
                <label
                  htmlFor="account-login-email"
                  style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '5px' }}
                >
                  EMAIL ADDRESS
                </label>
                <input
                  id="account-login-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  className="input-base"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                />
              </div>

              <div>
                <label
                  htmlFor="account-login-password"
                  style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '5px' }}
                >
                  PASSWORD
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    id="account-login-password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    className="input-base"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    style={{ paddingRight: '38px' }}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: 'absolute',
                      right: '10px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      color: 'var(--text-muted)',
                      padding: 0
                    }}
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary"
              style={{ width: '100%', padding: '11px' }}
            >
              {isLoading ? <RefreshCw size={16} className="animate-spin" /> : <span>Sign In</span>}
            </button>

            <div style={{ textAlign: 'center', marginTop: '14px', fontSize: '12px', color: 'var(--text-secondary)' }}>
              Don't have an account?{' '}
              <button
                type="button"
                onClick={() => {
                  setMode('signup');
                  setError(null);
                }}
                style={{ background: 'none', color: 'var(--accent-cyan)', fontWeight: 700, padding: 0 }}
              >
                Create Account
              </button>
            </div>
          </form>
        )}

        {/* SIGN UP FORM MODE */}
        {mode === 'signup' && (
          <form onSubmit={handleSignUpSubmit}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <button
                type="button"
                className="btn-ghost"
                onClick={() => setMode('profile')}
                style={{ padding: '4px 8px', fontSize: '12px' }}
              >
                ← Back
              </button>
              <h2 style={{ fontSize: '16px', fontWeight: 800, margin: 0 }}>Create SquadMaps Account</h2>
            </div>

            {error && (
              <div
                style={{
                  padding: '10px 12px',
                  backgroundColor: 'var(--accent-red-dim)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  borderRadius: 'var(--radius-xs)',
                  color: 'var(--accent-red)',
                  fontSize: '12px',
                  marginBottom: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <AlertCircle size={15} />
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div
                style={{
                  padding: '10px 12px',
                  backgroundColor: 'var(--accent-green-dim)',
                  border: '1px solid rgba(0, 214, 160, 0.3)',
                  borderRadius: 'var(--radius-xs)',
                  color: 'var(--accent-green)',
                  fontSize: '12px',
                  marginBottom: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <Check size={15} />
                <span>{success}</span>
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '18px' }}>
              <div>
                <label
                  htmlFor="account-signup-name"
                  style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '5px' }}
                >
                  SQUAD CALLSIGN / NAME
                </label>
                <input
                  id="account-signup-name"
                  name="name"
                  type="text"
                  autoComplete="nickname"
                  className="input-base"
                  value={signupName}
                  onChange={(e) => setSignupName(e.target.value)}
                  placeholder="Enter your callsign"
                  required
                />
              </div>

              <div>
                <label
                  htmlFor="account-signup-email"
                  style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '5px' }}
                >
                  EMAIL ADDRESS
                </label>
                <input
                  id="account-signup-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  className="input-base"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  required
                />
              </div>

              <div>
                <label
                  htmlFor="account-signup-password"
                  style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '5px' }}
                >
                  PASSWORD
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    id="account-signup-password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    className="input-base"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Create a password (min 8 chars)"
                    style={{ paddingRight: '38px' }}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: 'absolute',
                      right: '10px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      color: 'var(--text-muted)',
                      padding: 0
                    }}
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div>
                <label
                  htmlFor="account-signup-confirm-password"
                  style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '5px' }}
                >
                  CONFIRM PASSWORD
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    id="account-signup-confirm-password"
                    name="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    className="input-base"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm your password"
                    style={{ paddingRight: '38px' }}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    style={{
                      position: 'absolute',
                      right: '10px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      color: 'var(--text-muted)',
                      padding: 0
                    }}
                    title={showConfirmPassword ? 'Hide password' : 'Show password'}
                  >
                    {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary"
              style={{ width: '100%', padding: '11px' }}
            >
              {isLoading ? <RefreshCw size={16} className="animate-spin" /> : <span>Create Account</span>}
            </button>

            <div style={{ textAlign: 'center', marginTop: '14px', fontSize: '12px', color: 'var(--text-secondary)' }}>
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setError(null);
                }}
                style={{ background: 'none', color: 'var(--accent-cyan)', fontWeight: 700, padding: 0 }}
              >
                Log In
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
