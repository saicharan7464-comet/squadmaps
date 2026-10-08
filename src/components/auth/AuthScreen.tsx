import React, { useState, useEffect } from 'react';
import {
  Compass,
  Mail,
  Lock,
  Eye,
  EyeOff,
  User,
  ArrowRight,
  Sparkles,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  ArrowLeft,
  Shield,
  Zap,
  Radio
} from 'lucide-react';
import { useAuth } from '../../features/auth/AuthContext';

export type AuthScreenView =
  | 'login'
  | 'signup'
  | 'forgot_password'
  | 'verify_code'
  | 'reset_password'
  | 'email_sent_notice';

interface AuthScreenProps {
  initialView?: AuthScreenView;
  isUpgradeMode?: boolean;
  onSuccess?: () => void;
  onClose?: () => void; // If rendered inside a modal
}

export const AuthScreen: React.FC<AuthScreenProps> = ({
  initialView = 'login',
  isUpgradeMode = false,
  onSuccess,
  onClose
}) => {
  const {
    login,
    signUp,
    continueAsGuest,
    requestPasswordReset,
    verifyRecoveryCode,
    updatePassword,
    upgradeGuestAccount,
    isRecoveryMode,
    setIsRecoveryMode,
    authError,
    clearAuthError,
    user
  } = useAuth();

  const [currentView, setCurrentView] = useState<AuthScreenView>(
    isRecoveryMode ? 'reset_password' : isUpgradeMode ? 'signup' : initialView
  );

  // Form Fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState(user?.name || '');
  const [verificationCode, setVerificationCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');

  // Password Visibility Toggles
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);

  // Submission States
  const [isLoading, setIsLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Resend Cooldown Timer
  const [resendCooldown, setResendCooldown] = useState<number>(0);

  useEffect(() => {
    if (isRecoveryMode && currentView !== 'reset_password') {
      setCurrentView('reset_password');
    }
  }, [isRecoveryMode]);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const interval = setInterval(() => {
      setResendCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [resendCooldown]);

  const switchView = (newView: AuthScreenView) => {
    setFormError(null);
    clearAuthError();
    setSuccessMessage(null);
    setCurrentView(newView);
  };

  const validateEmail = (val: string): boolean => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val.trim());
  };

  // 1. Handle Login
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    clearAuthError();

    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setFormError('Please enter your email address.');
      return;
    }
    if (!validateEmail(cleanEmail)) {
      setFormError('Please enter a valid email address.');
      return;
    }
    if (!password) {
      setFormError('Please enter your password.');
      return;
    }

    setIsLoading(true);
    try {
      await login(cleanEmail, password);
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setFormError(err.message || 'Incorrect email or password.');
    } finally {
      setIsLoading(false);
    }
  };

  // 2. Handle Sign Up
  const handleSignUpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    clearAuthError();

    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setFormError('Please enter your email address.');
      return;
    }
    if (!validateEmail(cleanEmail)) {
      setFormError('Please enter a valid email address.');
      return;
    }
    if (!password) {
      setFormError('Please enter a password.');
      return;
    }
    if (password.length < 6) {
      setFormError('Password must be at least 6 characters long.');
      return;
    }
    if (!confirmPassword) {
      setFormError('Please confirm your password.');
      return;
    }
    if (password !== confirmPassword) {
      setFormError('Passwords do not match.');
      return;
    }

    setIsLoading(true);
    try {
      if (isUpgradeMode && user?.isGuest) {
        const res = await upgradeGuestAccount(cleanEmail, password, name.trim());
        if (res.requiresVerification) {
          setCurrentView('email_sent_notice');
        } else {
          setSuccessMessage('Account upgraded successfully! Welcome aboard.');
          if (onSuccess) onSuccess();
        }
      } else {
        const res = await signUp(cleanEmail, password, name.trim());
        if (res.requiresVerification) {
          setCurrentView('email_sent_notice');
        } else {
          setSuccessMessage('Account created successfully!');
          if (onSuccess) onSuccess();
        }
      }
    } catch (err: any) {
      setFormError(err.message || 'Could not complete registration. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // 3. Handle Forgot Password (Request recovery code / link)
  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    clearAuthError();

    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setFormError('Please enter your registered email address.');
      return;
    }
    if (!validateEmail(cleanEmail)) {
      setFormError('Please enter a valid email address.');
      return;
    }

    setIsLoading(true);
    try {
      await requestPasswordReset(cleanEmail);
      setResendCooldown(60);
      setCurrentView('verify_code');
      setSuccessMessage(`Recovery instructions sent to ${cleanEmail}.`);
    } catch (err: any) {
      setFormError(err.message || 'Unable to send recovery email. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };

  // 4. Handle Verify Code
  const handleVerifyCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    clearAuthError();

    const cleanCode = verificationCode.trim();
    if (!cleanCode) {
      setFormError('Please enter the verification code sent to your email.');
      return;
    }
    if (cleanCode.length < 6) {
      setFormError('Verification code must be at least 6 characters.');
      return;
    }

    setIsLoading(true);
    try {
      await verifyRecoveryCode(email.trim(), cleanCode);
      setCurrentView('reset_password');
      setSuccessMessage('Email verified successfully! You may now set a new password.');
    } catch (err: any) {
      setFormError(err.message || 'Invalid or expired verification code.');
    } finally {
      setIsLoading(false);
    }
  };

  // 5. Handle Resend Code
  const handleResendCode = async () => {
    if (resendCooldown > 0 || !email.trim()) return;
    setFormError(null);
    setIsLoading(true);
    try {
      await requestPasswordReset(email.trim());
      setResendCooldown(60);
      setSuccessMessage('A fresh verification code has been dispatched to your email.');
    } catch (err: any) {
      setFormError(err.message || 'Unable to resend code right now. Please wait and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // 6. Handle Reset Password (Set new password)
  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    clearAuthError();

    if (!newPassword) {
      setFormError('Please enter a new password.');
      return;
    }
    if (newPassword.length < 6) {
      setFormError('Password must be at least 6 characters long.');
      return;
    }
    if (!confirmNewPassword) {
      setFormError('Please confirm your new password.');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setFormError('Passwords do not match.');
      return;
    }

    setIsLoading(true);
    try {
      await updatePassword(newPassword);
      setIsRecoveryMode(false);
      setSuccessMessage('Password reset successfully! You can now log in with your new password.');
      setPassword('');
      setConfirmPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
      setTimeout(() => {
        switchView('login');
      }, 2000);
    } catch (err: any) {
      setFormError(err.message || 'Failed to update password. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // 7. Handle Continue as Guest
  const handleContinueAsGuest = async () => {
    setFormError(null);
    clearAuthError();
    setIsLoading(true);
    try {
      await continueAsGuest();
      if (onSuccess) onSuccess();
      if (onClose) onClose();
    } catch (err: any) {
      setFormError(err.message || 'Could not start guest session.');
    } finally {
      setIsLoading(false);
    }
  };

  const activeError = formError || authError;

  return (
    <div
      style={{
        width: '100%',
        minHeight: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px 16px',
        backgroundColor: onClose ? 'transparent' : 'var(--bg-primary)',
        boxSizing: 'border-box',
        position: 'relative'
      }}
    >
      {/* Background Neon Elements */}
      {!onClose && (
        <>
          <div
            style={{
              position: 'fixed',
              top: '10%',
              left: '50%',
              transform: 'translateX(-50%)',
              width: '500px',
              height: '350px',
              background: 'radial-gradient(circle, rgba(0, 240, 255, 0.08) 0%, rgba(10, 14, 23, 0) 70%)',
              pointerEvents: 'none',
              zIndex: 0
            }}
          />
          <div
            style={{
              position: 'fixed',
              bottom: '5%',
              right: '15%',
              width: '400px',
              height: '300px',
              background: 'radial-gradient(circle, rgba(0, 230, 118, 0.05) 0%, rgba(10, 14, 23, 0) 70%)',
              pointerEvents: 'none',
              zIndex: 0
            }}
          />
        </>
      )}

      {/* Main Authentication Card */}
      <div
        className="glass-card animate-fade-in"
        style={{
          width: '100%',
          maxWidth: '440px',
          padding: '32px 28px',
          boxSizing: 'border-box',
          position: 'relative',
          zIndex: 1,
          borderRadius: 'var(--radius-md)',
          boxShadow: 'var(--shadow-lg), 0 0 30px rgba(0, 240, 255, 0.08)',
          border: '1px solid var(--border-medium)',
          backgroundColor: 'var(--bg-glass-card)'
        }}
      >
        {/* Close Button if Modal */}
        {onClose && (
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
            ✕
          </button>
        )}

        {/* Branding & Logo Header */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div
            style={{
              width: '52px',
              height: '52px',
              borderRadius: '16px',
              background: 'linear-gradient(135deg, var(--accent-cyan), var(--accent-green))',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 25px rgba(0, 240, 255, 0.4)',
              marginBottom: '14px'
            }}
          >
            <Compass size={28} color="#0A0E17" />
          </div>

          <h1
            style={{
              fontSize: '24px',
              fontWeight: 800,
              color: '#FFFFFF',
              letterSpacing: '-0.5px',
              marginBottom: '6px'
            }}
          >
            Squad<span className="text-cyan">Maps</span>
          </h1>

          <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            {isUpgradeMode
              ? 'Upgrade your temporary session to a permanent account'
              : currentView === 'login'
              ? 'Welcome back! Log in to join your squad convoy'
              : currentView === 'signup'
              ? 'Create an account to start hosting & saving trips'
              : currentView === 'forgot_password'
              ? 'Recover your account password securely'
              : currentView === 'verify_code'
              ? 'Enter the verification code sent to your email'
              : currentView === 'reset_password'
              ? 'Create a new secure password for your account'
              : 'Verification email sent'}
          </p>
        </div>

        {/* Tab Switcher (Login vs Sign Up) */}
        {(currentView === 'login' || currentView === 'signup') && (
          <div
            style={{
              display: 'flex',
              backgroundColor: 'var(--bg-tertiary)',
              padding: '4px',
              borderRadius: 'var(--radius-sm)',
              marginBottom: '20px',
              border: '1px solid var(--border-subtle)'
            }}
          >
            <button
              type="button"
              onClick={() => switchView('login')}
              style={{
                flex: 1,
                padding: '10px 0',
                borderRadius: 'var(--radius-xs)',
                fontSize: '14px',
                fontWeight: 700,
                backgroundColor: currentView === 'login' ? 'var(--accent-cyan)' : 'transparent',
                color: currentView === 'login' ? 'var(--text-inverse)' : 'var(--text-secondary)',
                boxShadow: currentView === 'login' ? '0 2px 8px rgba(0, 240, 255, 0.3)' : 'none',
                transition: 'all 0.2s ease'
              }}
            >
              Log In
            </button>
            <button
              type="button"
              onClick={() => switchView('signup')}
              style={{
                flex: 1,
                padding: '10px 0',
                borderRadius: 'var(--radius-xs)',
                fontSize: '14px',
                fontWeight: 700,
                backgroundColor: currentView === 'signup' ? 'var(--accent-cyan)' : 'transparent',
                color: currentView === 'signup' ? 'var(--text-inverse)' : 'var(--text-secondary)',
                boxShadow: currentView === 'signup' ? '0 2px 8px rgba(0, 240, 255, 0.3)' : 'none',
                transition: 'all 0.2s ease'
              }}
            >
              Sign Up
            </button>
          </div>
        )}

        {/* Global Error Banner */}
        {activeError && (
          <div
            className="animate-slide-down"
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '10px',
              padding: '12px 14px',
              backgroundColor: 'rgba(255, 61, 113, 0.12)',
              border: '1px solid rgba(255, 61, 113, 0.35)',
              borderRadius: 'var(--radius-xs)',
              marginBottom: '18px',
              color: 'var(--accent-red)',
              fontSize: '13px',
              lineHeight: 1.4
            }}
          >
            <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
            <span style={{ wordBreak: 'break-word' }}>{activeError}</span>
          </div>
        )}

        {/* Success Banner */}
        {successMessage && (
          <div
            className="animate-slide-down"
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '10px',
              padding: '12px 14px',
              backgroundColor: 'rgba(0, 230, 118, 0.12)',
              border: '1px solid rgba(0, 230, 118, 0.35)',
              borderRadius: 'var(--radius-xs)',
              marginBottom: '18px',
              color: 'var(--accent-green)',
              fontSize: '13px',
              lineHeight: 1.4
            }}
          >
            <CheckCircle2 size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
            <span>{successMessage}</span>
          </div>
        )}

        {/* ==================================================== */}
        {/* VIEW 1: LOGIN FORM */}
        {/* ==================================================== */}
        {currentView === 'login' && (
          <form onSubmit={handleLoginSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Email Input */}
            <div>
              <label
                htmlFor="login-email"
                style={{
                  display: 'block',
                  fontSize: '12px',
                  fontWeight: 700,
                  color: 'var(--text-secondary)',
                  marginBottom: '6px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}
              >
                Email Address
              </label>
              <div style={{ position: 'relative' }}>
                <Mail
                  size={18}
                  color="var(--text-muted)"
                  style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }}
                />
                <input
                  id="login-email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (formError) setFormError(null);
                  }}
                  placeholder="pilot@squadmaps.app"
                  required
                  style={{
                    width: '100%',
                    padding: '13px 14px 13px 42px',
                    borderRadius: 'var(--radius-xs)',
                    backgroundColor: 'var(--bg-secondary)',
                    border: '1px solid var(--border-medium)',
                    color: 'var(--text-primary)',
                    fontSize: '14px',
                    boxSizing: 'border-box',
                    outline: 'none'
                  }}
                />
              </div>
            </div>

            {/* Password Input */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label
                  htmlFor="login-password"
                  style={{
                    fontSize: '12px',
                    fontWeight: 700,
                    color: 'var(--text-secondary)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}
                >
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => switchView('forgot_password')}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--accent-cyan)',
                    fontSize: '12px',
                    fontWeight: 600,
                    padding: 0,
                    cursor: 'pointer'
                  }}
                >
                  Forgot Password?
                </button>
              </div>
              <div style={{ position: 'relative' }}>
                <Lock
                  size={18}
                  color="var(--text-muted)"
                  style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }}
                />
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (formError) setFormError(null);
                  }}
                  placeholder="••••••••••••"
                  required
                  style={{
                    width: '100%',
                    padding: '13px 44px 13px 42px',
                    borderRadius: 'var(--radius-xs)',
                    backgroundColor: 'var(--bg-secondary)',
                    border: '1px solid var(--border-medium)',
                    color: 'var(--text-primary)',
                    fontSize: '14px',
                    boxSizing: 'border-box',
                    outline: 'none'
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-muted)',
                    padding: '4px',
                    cursor: 'pointer'
                  }}
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Login Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary"
              style={{
                width: '100%',
                padding: '14px',
                fontSize: '15px',
                borderRadius: 'var(--radius-xs)',
                marginTop: '4px'
              }}
            >
              {isLoading ? (
                <>
                  <RefreshCw size={18} className="animate-spin" />
                  <span>Logging in...</span>
                </>
              ) : (
                <>
                  <span>Log In</span>
                  <ArrowRight size={18} />
                </>
              )}
            </button>

            {/* Switch to Sign Up */}
            <div style={{ textAlign: 'center', fontSize: '13px', color: 'var(--text-secondary)' }}>
              Don't have an account?{' '}
              <button
                type="button"
                onClick={() => switchView('signup')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--accent-cyan)',
                  fontWeight: 700,
                  cursor: 'pointer',
                  padding: 0
                }}
              >
                Sign Up
              </button>
            </div>

            {/* Continue as Guest Separator & Button */}
            {!isUpgradeMode && (
              <>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    margin: '8px 0 2px',
                    color: 'var(--text-muted)',
                    fontSize: '12px',
                    fontWeight: 600,
                    textTransform: 'uppercase'
                  }}
                >
                  <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--border-subtle)' }} />
                  <span>or</span>
                  <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--border-subtle)' }} />
                </div>

                <button
                  type="button"
                  onClick={handleContinueAsGuest}
                  disabled={isLoading}
                  className="btn-secondary"
                  style={{
                    width: '100%',
                    padding: '14px',
                    fontSize: '14px',
                    borderRadius: 'var(--radius-xs)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    backgroundColor: 'rgba(255, 255, 255, 0.04)',
                    borderColor: 'var(--border-medium)'
                  }}
                >
                  <Zap size={16} color="var(--accent-amber)" />
                  <span>Continue as Guest</span>
                </button>
                <div style={{ textAlign: 'center', fontSize: '11px', color: 'var(--text-muted)' }}>
                  Explore maps, view routes, and join convoys without an account
                </div>
              </>
            )}
          </form>
        )}

        {/* ==================================================== */}
        {/* VIEW 2: SIGN UP FORM */}
        {/* ==================================================== */}
        {currentView === 'signup' && (
          <form onSubmit={handleSignUpSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Display Name / Callsign */}
            <div>
              <label
                htmlFor="signup-name"
                style={{
                  display: 'block',
                  fontSize: '12px',
                  fontWeight: 700,
                  color: 'var(--text-secondary)',
                  marginBottom: '6px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}
              >
                Squad Callsign / Name
              </label>
              <div style={{ position: 'relative' }}>
                <User
                  size={18}
                  color="var(--text-muted)"
                  style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }}
                />
                <input
                  id="signup-name"
                  type="text"
                  autoComplete="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Apex Pilot or Alex"
                  style={{
                    width: '100%',
                    padding: '13px 14px 13px 42px',
                    borderRadius: 'var(--radius-xs)',
                    backgroundColor: 'var(--bg-secondary)',
                    border: '1px solid var(--border-medium)',
                    color: 'var(--text-primary)',
                    fontSize: '14px',
                    boxSizing: 'border-box',
                    outline: 'none'
                  }}
                />
              </div>
            </div>

            {/* Email Address */}
            <div>
              <label
                htmlFor="signup-email"
                style={{
                  display: 'block',
                  fontSize: '12px',
                  fontWeight: 700,
                  color: 'var(--text-secondary)',
                  marginBottom: '6px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}
              >
                Email Address
              </label>
              <div style={{ position: 'relative' }}>
                <Mail
                  size={18}
                  color="var(--text-muted)"
                  style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }}
                />
                <input
                  id="signup-email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (formError) setFormError(null);
                  }}
                  placeholder="pilot@squadmaps.app"
                  required
                  style={{
                    width: '100%',
                    padding: '13px 14px 13px 42px',
                    borderRadius: 'var(--radius-xs)',
                    backgroundColor: 'var(--bg-secondary)',
                    border: '1px solid var(--border-medium)',
                    color: 'var(--text-primary)',
                    fontSize: '14px',
                    boxSizing: 'border-box',
                    outline: 'none'
                  }}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label
                htmlFor="signup-password"
                style={{
                  display: 'block',
                  fontSize: '12px',
                  fontWeight: 700,
                  color: 'var(--text-secondary)',
                  marginBottom: '6px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}
              >
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <Lock
                  size={18}
                  color="var(--text-muted)"
                  style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }}
                />
                <input
                  id="signup-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (formError) setFormError(null);
                  }}
                  placeholder="Min. 6 characters"
                  required
                  style={{
                    width: '100%',
                    padding: '13px 44px 13px 42px',
                    borderRadius: 'var(--radius-xs)',
                    backgroundColor: 'var(--bg-secondary)',
                    border: '1px solid var(--border-medium)',
                    color: 'var(--text-primary)',
                    fontSize: '14px',
                    boxSizing: 'border-box',
                    outline: 'none'
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-muted)',
                    padding: '4px',
                    cursor: 'pointer'
                  }}
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <label
                htmlFor="signup-confirm-password"
                style={{
                  display: 'block',
                  fontSize: '12px',
                  fontWeight: 700,
                  color: 'var(--text-secondary)',
                  marginBottom: '6px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}
              >
                Confirm Password
              </label>
              <div style={{ position: 'relative' }}>
                <Lock
                  size={18}
                  color="var(--text-muted)"
                  style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }}
                />
                <input
                  id="signup-confirm-password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    if (formError) setFormError(null);
                  }}
                  placeholder="Re-enter your password"
                  required
                  style={{
                    width: '100%',
                    padding: '13px 44px 13px 42px',
                    borderRadius: 'var(--radius-xs)',
                    backgroundColor: 'var(--bg-secondary)',
                    border: '1px solid var(--border-medium)',
                    color: 'var(--text-primary)',
                    fontSize: '14px',
                    boxSizing: 'border-box',
                    outline: 'none'
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-muted)',
                    padding: '4px',
                    cursor: 'pointer'
                  }}
                  title={showConfirmPassword ? 'Hide password' : 'Show password'}
                >
                  {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Sign Up Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary"
              style={{
                width: '100%',
                padding: '14px',
                fontSize: '15px',
                borderRadius: 'var(--radius-xs)',
                marginTop: '4px'
              }}
            >
              {isLoading ? (
                <>
                  <RefreshCw size={18} className="animate-spin" />
                  <span>{isUpgradeMode ? 'Upgrading Account...' : 'Creating Account...'}</span>
                </>
              ) : (
                <>
                  <span>{isUpgradeMode ? 'Upgrade to Registered Account' : 'Create Account'}</span>
                  <ArrowRight size={18} />
                </>
              )}
            </button>

            {/* Switch to Login */}
            <div style={{ textAlign: 'center', fontSize: '13px', color: 'var(--text-secondary)' }}>
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => switchView('login')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--accent-cyan)',
                  fontWeight: 700,
                  cursor: 'pointer',
                  padding: 0
                }}
              >
                Log In
              </button>
            </div>

            {/* Continue as Guest Separator & Button */}
            {!isUpgradeMode && (
              <>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    margin: '8px 0 2px',
                    color: 'var(--text-muted)',
                    fontSize: '12px',
                    fontWeight: 600,
                    textTransform: 'uppercase'
                  }}
                >
                  <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--border-subtle)' }} />
                  <span>or</span>
                  <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--border-subtle)' }} />
                </div>

                <button
                  type="button"
                  onClick={handleContinueAsGuest}
                  disabled={isLoading}
                  className="btn-secondary"
                  style={{
                    width: '100%',
                    padding: '14px',
                    fontSize: '14px',
                    borderRadius: 'var(--radius-xs)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    backgroundColor: 'rgba(255, 255, 255, 0.04)',
                    borderColor: 'var(--border-medium)'
                  }}
                >
                  <Zap size={16} color="var(--accent-amber)" />
                  <span>Continue as Guest</span>
                </button>
              </>
            )}
          </form>
        )}

        {/* ==================================================== */}
        {/* VIEW 3: FORGOT PASSWORD */}
        {/* ==================================================== */}
        {currentView === 'forgot_password' && (
          <form onSubmit={handleForgotPasswordSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label
                htmlFor="recovery-email"
                style={{
                  display: 'block',
                  fontSize: '12px',
                  fontWeight: 700,
                  color: 'var(--text-secondary)',
                  marginBottom: '6px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}
              >
                Account Email Address
              </label>
              <div style={{ position: 'relative' }}>
                <Mail
                  size={18}
                  color="var(--text-muted)"
                  style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }}
                />
                <input
                  id="recovery-email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (formError) setFormError(null);
                  }}
                  placeholder="Enter your registered email"
                  required
                  style={{
                    width: '100%',
                    padding: '13px 14px 13px 42px',
                    borderRadius: 'var(--radius-xs)',
                    backgroundColor: 'var(--bg-secondary)',
                    border: '1px solid var(--border-medium)',
                    color: 'var(--text-primary)',
                    fontSize: '14px',
                    boxSizing: 'border-box',
                    outline: 'none'
                  }}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary"
              style={{
                width: '100%',
                padding: '14px',
                fontSize: '15px',
                borderRadius: 'var(--radius-xs)',
                marginTop: '4px'
              }}
            >
              {isLoading ? (
                <>
                  <RefreshCw size={18} className="animate-spin" />
                  <span>Sending Recovery Code...</span>
                </>
              ) : (
                <>
                  <span>Send Recovery Code</span>
                  <ArrowRight size={18} />
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => switchView('login')}
              className="btn-secondary"
              style={{
                width: '100%',
                padding: '12px',
                fontSize: '13px',
                borderRadius: 'var(--radius-xs)'
              }}
            >
              <ArrowLeft size={16} />
              <span>Back to Login</span>
            </button>
          </form>
        )}

        {/* ==================================================== */}
        {/* VIEW 4: VERIFY RECOVERY CODE */}
        {/* ==================================================== */}
        {currentView === 'verify_code' && (
          <form onSubmit={handleVerifyCodeSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label
                  htmlFor="verify-code"
                  style={{
                    fontSize: '12px',
                    fontWeight: 700,
                    color: 'var(--text-secondary)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}
                >
                  6-Digit Recovery Code
                </label>
                <span style={{ fontSize: '11px', color: 'var(--accent-cyan)' }}>Sent to {email}</span>
              </div>
              <div style={{ position: 'relative' }}>
                <KeyRound
                  size={18}
                  color="var(--text-muted)"
                  style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }}
                />
                <input
                  id="verify-code"
                  type="text"
                  maxLength={10}
                  value={verificationCode}
                  onChange={(e) => {
                    setVerificationCode(e.target.value.trim());
                    if (formError) setFormError(null);
                  }}
                  placeholder="e.g. 123456"
                  required
                  style={{
                    width: '100%',
                    padding: '13px 14px 13px 42px',
                    borderRadius: 'var(--radius-xs)',
                    backgroundColor: 'var(--bg-secondary)',
                    border: '1px solid var(--border-medium)',
                    color: 'var(--text-primary)',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '16px',
                    letterSpacing: '2px',
                    boxSizing: 'border-box',
                    outline: 'none'
                  }}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary"
              style={{
                width: '100%',
                padding: '14px',
                fontSize: '15px',
                borderRadius: 'var(--radius-xs)'
              }}
            >
              {isLoading ? (
                <>
                  <RefreshCw size={18} className="animate-spin" />
                  <span>Verifying Code...</span>
                </>
              ) : (
                <>
                  <span>Verify Code</span>
                  <ArrowRight size={18} />
                </>
              )}
            </button>

            {/* Resend Code Section */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '13px' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Didn't receive code?</span>
              <button
                type="button"
                onClick={handleResendCode}
                disabled={resendCooldown > 0 || isLoading}
                style={{
                  background: 'none',
                  border: 'none',
                  color: resendCooldown > 0 ? 'var(--text-muted)' : 'var(--accent-cyan)',
                  fontWeight: 700,
                  cursor: resendCooldown > 0 ? 'default' : 'pointer',
                  padding: 0
                }}
              >
                {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend Code'}
              </button>
            </div>

            <button
              type="button"
              onClick={() => switchView('login')}
              className="btn-secondary"
              style={{
                width: '100%',
                padding: '12px',
                fontSize: '13px',
                borderRadius: 'var(--radius-xs)'
              }}
            >
              <ArrowLeft size={16} />
              <span>Back to Login</span>
            </button>
          </form>
        )}

        {/* ==================================================== */}
        {/* VIEW 5: RESET PASSWORD FORM */}
        {/* ==================================================== */}
        {currentView === 'reset_password' && (
          <form onSubmit={handleResetPasswordSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* New Password */}
            <div>
              <label
                htmlFor="new-password"
                style={{
                  display: 'block',
                  fontSize: '12px',
                  fontWeight: 700,
                  color: 'var(--text-secondary)',
                  marginBottom: '6px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}
              >
                New Password
              </label>
              <div style={{ position: 'relative' }}>
                <Lock
                  size={18}
                  color="var(--text-muted)"
                  style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }}
                />
                <input
                  id="new-password"
                  type={showNewPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={newPassword}
                  onChange={(e) => {
                    setNewPassword(e.target.value);
                    if (formError) setFormError(null);
                  }}
                  placeholder="Min. 6 characters"
                  required
                  style={{
                    width: '100%',
                    padding: '13px 44px 13px 42px',
                    borderRadius: 'var(--radius-xs)',
                    backgroundColor: 'var(--bg-secondary)',
                    border: '1px solid var(--border-medium)',
                    color: 'var(--text-primary)',
                    fontSize: '14px',
                    boxSizing: 'border-box',
                    outline: 'none'
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-muted)',
                    padding: '4px',
                    cursor: 'pointer'
                  }}
                  title={showNewPassword ? 'Hide password' : 'Show password'}
                >
                  {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Confirm New Password */}
            <div>
              <label
                htmlFor="confirm-new-password"
                style={{
                  display: 'block',
                  fontSize: '12px',
                  fontWeight: 700,
                  color: 'var(--text-secondary)',
                  marginBottom: '6px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}
              >
                Confirm New Password
              </label>
              <div style={{ position: 'relative' }}>
                <Lock
                  size={18}
                  color="var(--text-muted)"
                  style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }}
                />
                <input
                  id="confirm-new-password"
                  type={showConfirmNewPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={confirmNewPassword}
                  onChange={(e) => {
                    setConfirmNewPassword(e.target.value);
                    if (formError) setFormError(null);
                  }}
                  placeholder="Re-enter your new password"
                  required
                  style={{
                    width: '100%',
                    padding: '13px 44px 13px 42px',
                    borderRadius: 'var(--radius-xs)',
                    backgroundColor: 'var(--bg-secondary)',
                    border: '1px solid var(--border-medium)',
                    color: 'var(--text-primary)',
                    fontSize: '14px',
                    boxSizing: 'border-box',
                    outline: 'none'
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmNewPassword(!showConfirmNewPassword)}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-muted)',
                    padding: '4px',
                    cursor: 'pointer'
                  }}
                  title={showConfirmNewPassword ? 'Hide password' : 'Show password'}
                >
                  {showConfirmNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary"
              style={{
                width: '100%',
                padding: '14px',
                fontSize: '15px',
                borderRadius: 'var(--radius-xs)',
                marginTop: '4px'
              }}
            >
              {isLoading ? (
                <>
                  <RefreshCw size={18} className="animate-spin" />
                  <span>Updating Password...</span>
                </>
              ) : (
                <>
                  <span>Reset Password</span>
                  <ArrowRight size={18} />
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => switchView('login')}
              className="btn-secondary"
              style={{
                width: '100%',
                padding: '12px',
                fontSize: '13px',
                borderRadius: 'var(--radius-xs)'
              }}
            >
              <ArrowLeft size={16} />
              <span>Continue to Login</span>
            </button>
          </form>
        )}

        {/* ==================================================== */}
        {/* VIEW 6: EMAIL SENT CONFIRMATION NOTICE */}
        {/* ==================================================== */}
        {currentView === 'email_sent_notice' && (
          <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                backgroundColor: 'rgba(0, 230, 118, 0.15)',
                border: '1px solid rgba(0, 230, 118, 0.35)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto',
                color: 'var(--accent-green)'
              }}
            >
              <Mail size={28} />
            </div>

            <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#FFFFFF' }}>Check Your Inbox</h3>

            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              We've dispatched a confirmation link to <strong style={{ color: 'var(--accent-cyan)' }}>{email}</strong>.
              Please verify your email address to activate your account and start your navigation sessions.
            </p>

            <button
              type="button"
              onClick={() => switchView('login')}
              className="btn-primary"
              style={{
                width: '100%',
                padding: '14px',
                fontSize: '14px',
                borderRadius: 'var(--radius-xs)',
                marginTop: '8px'
              }}
            >
              <span>Back to Login</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
