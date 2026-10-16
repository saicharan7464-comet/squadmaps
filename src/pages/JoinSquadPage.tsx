import React, { useState, useEffect } from 'react';
import { Squad } from '../types/squad';
import { LatLng } from '../types/navigation';
import { squadDataService } from '../services/squad/squadDataService';
import { formatDistance, formatDuration } from '../utils/format';
import { useAuth } from '../features/auth/AuthContext';
import { useSquad } from '../features/squad/SquadContext';
import {
  Car,
  Bike,
  Footprints,
  Bus,
  Flag,
  Navigation,
  ShieldCheck,
  AlertCircle,
  Users,
  Compass,
  ArrowRight
} from 'lucide-react';

interface JoinSquadPageProps {
  squadId: string;
  onJoinSuccess: (squad: Squad) => void;
  onCancel: () => void;
  onRequestLocation: () => Promise<boolean>;
}

export const JoinSquadPage: React.FC<JoinSquadPageProps> = ({
  squadId,
  onJoinSuccess,
  onCancel,
  onRequestLocation
}) => {
  const { user, loginAsGuest, updateProfileName } = useAuth();
  const { joinSquad } = useSquad();
  const [squad, setSquad] = useState<Squad | null>(null);
  const [memberCount, setMemberCount] = useState<number>(1);
  const [memberName, setMemberName] = useState<string>('');
  const [nameError, setNameError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showPermissionDialog, setShowPermissionDialog] = useState(false);
  const [isJoining, setIsJoining] = useState(false);

  useEffect(() => {
    const fetchSquadDetails = async () => {
      setIsLoading(true);
      try {
        const found = await squadDataService.getSquad(squadId);
        if (!found) {
          setError(`Squad #${squadId} was not found or has expired.`);
        } else if (found.status === 'ended') {
          setError(`This squad session has already ended.`);
        } else {
          setSquad(found);
          const members = await squadDataService.getMembers(squadId);
          setMemberCount(members.length || 1);
        }
      } catch (err) {
        setError('Failed to load squad details.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchSquadDetails();
  }, [squadId]);

  const handleJoinClick = () => {
    if (!memberName.trim()) {
      setNameError('Please enter your name or callsign to join the squad.');
      return;
    }
    setNameError(null);
    setShowPermissionDialog(true);
  };

  const handleConfirmJoinWithLocation = async () => {
    if (!memberName.trim()) {
      setNameError('Please enter your name to join the squad.');
      return;
    }
    const finalName = memberName.trim();
    setIsJoining(true);
    let coords: LatLng | undefined;
    try {
      if ('geolocation' in navigator) {
        coords = await new Promise<LatLng | undefined>((resolve) => {
          navigator.geolocation.getCurrentPosition(
            (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
            () => resolve(undefined),
            { timeout: 5000, maximumAge: 60000 }
          );
        });
      }
      let currentUser = user;
      if (!currentUser) {
        currentUser = await loginAsGuest(finalName);
      } else {
        updateProfileName(finalName);
      }
      if (squad) {
        const joined = await joinSquad(squad.squadId, coords, finalName);
        if (joined) {
          onJoinSuccess(squad);
        } else {
          setError('Failed to join squad session. Please try again.');
        }
      }
    } catch (err) {
      console.warn('Location permission or join error:', err);
      if (squad) {
        try {
          const fallbackName = memberName.trim() || user?.name || 'Squad Member';
          if (!user) await loginAsGuest(fallbackName);
          else updateProfileName(fallbackName);
          const joined = await joinSquad(squad.squadId, undefined, fallbackName);
          if (joined) {
            onJoinSuccess(squad);
          } else {
            setError('Failed to join squad session.');
          }
        } catch (e) {
          console.warn('Fallback join error:', e);
          setError('Failed to join squad session.');
        }
      }
    } finally {
      setIsJoining(false);
    }
  };

  const renderVehicleIcon = (mode: string) => {
    switch (mode) {
      case 'motorcycle':
        return <Bike size={18} color="var(--accent-cyan)" />;
      case 'bicycle':
        return <Bike size={18} color="var(--accent-cyan)" />;
      case 'walking':
        return <Footprints size={18} color="var(--accent-cyan)" />;
      case 'transit':
        return <Bus size={18} color="var(--accent-cyan)" />;
      default:
        return <Car size={18} color="var(--accent-cyan)" />;
    }
  };

  if (isLoading) {
    return (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '16px',
          backgroundColor: 'var(--bg-canvas)'
        }}
      >
        <div
          style={{
            width: '44px',
            height: '44px',
            borderRadius: '50%',
            border: '3px solid rgba(0, 102, 255, 0.2)',
            borderTopColor: 'var(--accent-primary)',
            animation: 'radarSweep 0.8s linear infinite'
          }}
        />
        <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 600 }}>
          Locating Convoy Channel...
        </span>
      </div>
    );
  }

  if (error || !squad) {
    return (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'var(--bg-canvas)',
          padding: '24px'
        }}
      >
        <div
          className="cockpit-card"
          style={{
            maxWidth: '440px',
            width: '100%',
            padding: '36px 28px',
            textAlign: 'center',
            backgroundColor: 'var(--bg-surface)'
          }}
        >
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              backgroundColor: 'var(--status-alert-dim)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 18px',
              color: 'var(--status-alert)'
            }}
          >
            <AlertCircle size={28} />
          </div>
          <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#FFFFFF', marginBottom: '8px' }}>
            Squad Not Available
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', lineHeight: 1.5, marginBottom: '28px' }}>
            {error || 'This squad invitation link is invalid or no longer active.'}
          </p>
          <button onClick={onCancel} className="btn-primary" style={{ width: '100%', padding: '12px' }}>
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="page-scroll-container mobile-no-overflow"
      style={{
        width: '100%',
        height: '100%',
        minHeight: '100%',
        overflowY: 'auto',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'var(--bg-canvas)',
        padding: '24px 16px calc(88px + env(safe-area-inset-bottom, 16px))',
        position: 'relative',
        boxSizing: 'border-box'
      }}
    >
      <div
        className="cockpit-card animate-modal-in"
        style={{
          maxWidth: '500px',
          width: '100%',
          padding: '32px 28px',
          border: '1px solid var(--border-medium)',
          boxShadow: 'var(--shadow-elevated)',
          position: 'relative'
        }}
      >
        {/* Header Badge */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <span className="badge badge-blue">CONVOY INVITATION</span>
          <span className="font-mono text-cyan" style={{ fontSize: '12px', fontWeight: 700 }}>
            CODE: {squad.squadId}
          </span>
        </div>

        <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#FFFFFF', lineHeight: 1.25, margin: 0 }}>
          {squad.name || `Trip to ${squad.destination}`}
        </h1>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '6px', marginBottom: '24px' }}>
          Trip Leader: <strong style={{ color: 'var(--accent-cyan)' }}>{squad.hostName}</strong>
        </p>

        {/* Squad Details Cockpit Block */}
        <div
          className="elevated-card"
          style={{
            padding: '18px 20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            marginBottom: '24px',
            backgroundColor: 'var(--bg-primary)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'rgba(0, 102, 255, 0.12)',
                border: '1px solid rgba(0, 102, 255, 0.25)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}
            >
              <Flag size={18} color="var(--accent-cyan)" />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                DESTINATION
              </div>
              <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {squad.destination}
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', paddingTop: '14px', borderTop: '1px solid var(--border-subtle)' }}>
            <div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 800, letterSpacing: '0.5px' }}>ROUTE</div>
              <div className="font-mono text-cyan" style={{ fontSize: '15px', fontWeight: 800 }}>
                {formatDistance(squad.canonicalRoute.distance)}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 800, letterSpacing: '0.5px' }}>EST. DURATION</div>
              <div className="font-mono text-green" style={{ fontSize: '15px', fontWeight: 800 }}>
                {formatDuration(squad.canonicalRoute.duration)}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 800, letterSpacing: '0.5px' }}>RIDERS</div>
              <div className="font-mono" style={{ fontSize: '15px', fontWeight: 800, color: '#FFFFFF' }}>
                {memberCount} active
              </div>
            </div>
          </div>
        </div>

        {/* Member Name Input */}
        <div style={{ marginBottom: '24px', textAlign: 'left' }}>
          <label
            htmlFor="join-member-name"
            style={{
              fontSize: '11px',
              fontWeight: 800,
              color: nameError ? 'var(--status-alert)' : 'var(--text-muted)',
              display: 'block',
              marginBottom: '6px',
              letterSpacing: '0.4px'
            }}
          >
            YOUR CALLSIGN / DISPLAY NAME *
          </label>
          <input
            id="join-member-name"
            type="text"
            value={memberName}
            onChange={(e) => {
              setMemberName(e.target.value);
              if (nameError) setNameError(null);
            }}
            placeholder="e.g. Apex Pilot, Road Runner"
            className="input-base"
            style={{
              width: '100%',
              fontSize: '14px',
              borderColor: nameError ? 'var(--status-alert)' : undefined
            }}
            autoFocus
            autoComplete="nickname"
          />
          {nameError ? (
            <p style={{ fontSize: '12px', color: 'var(--status-alert)', marginTop: '6px', fontWeight: 600 }}>
              {nameError}
            </p>
          ) : (
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '6px' }}>
              Your callsign will be visible to the convoy lead and riders on the shared radar.
            </p>
          )}
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '12px' }}>
          <button type="button" onClick={onCancel} className="btn-secondary" style={{ flex: 1, padding: '13px' }}>
            Cancel
          </button>
          <button
            type="button"
            onClick={handleJoinClick}
            className="btn-primary"
            style={{ flex: 2, padding: '13px', fontSize: '14px' }}
          >
            <Navigation size={16} />
            <span>Join Convoy</span>
          </button>
        </div>
      </div>

      {/* Permission Explanation Modal */}
      {showPermissionDialog && (
        <div className="modal-overlay">
          <div
            className="cockpit-card animate-modal-in"
            style={{
              maxWidth: '440px',
              width: '100%',
              padding: '30px 24px',
              textAlign: 'center',
              backgroundColor: 'var(--bg-elevated)',
              boxShadow: 'var(--shadow-elevated)'
            }}
            role="dialog"
            aria-modal="true"
          >
            <div
              style={{
                width: '54px',
                height: '54px',
                borderRadius: '50%',
                backgroundColor: 'rgba(0, 102, 255, 0.12)',
                border: '1px solid rgba(0, 102, 255, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px'
              }}
            >
              <ShieldCheck size={26} color="var(--accent-cyan)" />
            </div>

            <h3 style={{ fontSize: '19px', fontWeight: 800, color: '#FFFFFF', marginBottom: '8px' }}>
              Live GPS Sync Permission
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '24px' }}>
              SquadMaps uses your GPS location to provide synchronized turn-by-turn routing and calculate inter-member distances in real time.
              <br /><br />
              <strong style={{ color: 'var(--text-primary)' }}>Your location is only active within this squad session.</strong> You can pause GPS sharing anytime during the drive.
            </p>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setShowPermissionDialog(false)}
                className="btn-secondary"
                style={{ flex: 1, padding: '12px' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmJoinWithLocation}
                disabled={isJoining}
                className="btn-primary"
                style={{ flex: 2, padding: '12px', fontSize: '14px' }}
              >
                {isJoining ? 'Connecting...' : 'Allow GPS & Enter'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
