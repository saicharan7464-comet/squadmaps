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
  AlertCircle
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
      setNameError('Please enter your name to join the squad.');
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
          const finalName = memberName.trim() || user?.name || 'Squad Member';
          if (!user) await loginAsGuest(finalName);
          else updateProfileName(finalName);
          const joined = await joinSquad(squad.squadId, undefined, finalName);
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
        return <Bike size={20} color="var(--accent-cyan)" />;
      case 'bicycle':
        return <Bike size={20} color="var(--accent-cyan)" />;
      case 'walking':
        return <Footprints size={20} color="var(--accent-cyan)" />;
      case 'transit':
        return <Bus size={20} color="var(--accent-cyan)" />;
      default:
        return <Car size={20} color="var(--accent-cyan)" />;
    }
  };

  if (isLoading) {
    return (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'var(--bg-primary)'
        }}
      >
        <div
          style={{
            width: '44px',
            height: '44px',
            borderRadius: '50%',
            border: '3px solid var(--accent-cyan)',
            borderTopColor: 'transparent',
            animation: 'radarSweep 0.8s linear infinite'
          }}
        />
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
          backgroundColor: 'var(--bg-primary)',
          padding: '20px'
        }}
      >
        <div
          className="glass-panel"
          style={{
            maxWidth: '420px',
            width: '100%',
            padding: '32px',
            textAlign: 'center',
            backgroundColor: 'var(--bg-secondary)'
          }}
        >
          <AlertCircle size={48} color="var(--accent-red)" style={{ margin: '0 auto 16px' }} />
          <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#FFFFFF', marginBottom: '8px' }}>
            Squad Not Available
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '24px' }}>
            {error || 'This squad invitation link is invalid or no longer active.'}
          </p>
          <button onClick={onCancel} className="btn-primary" style={{ width: '100%', padding: '12px' }}>
            Go to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'var(--bg-primary)',
        padding: '20px',
        position: 'relative'
      }}
    >
      <div
        className="surface-card animate-fade-in"
        style={{
          maxWidth: '480px',
          width: '100%',
          padding: '32px',
          boxShadow: 'var(--shadow-xl)'
        }}
      >
        {/* Header Badge */}
        <div style={{ marginBottom: '16px' }}>
          <span className="badge badge-cyan" style={{ fontSize: '11px', letterSpacing: '0.5px' }}>
            CONVOY INVITATION
          </span>
        </div>

        <h1 style={{ fontSize: '26px', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.2, margin: 0 }}>
          {squad.name}
        </h1>
        <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginTop: '6px', marginBottom: '24px' }}>
          Hosted by <strong style={{ color: 'var(--accent-cyan)' }}>{squad.hostName}</strong>
        </p>

        {/* Squad Details Card */}
        <div
          className="elevated-card"
          style={{
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            marginBottom: '24px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'rgba(0, 217, 232, 0.12)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}
            >
              <Flag size={18} color="var(--accent-cyan)" />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Destination
              </div>
              <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {squad.destination}
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', paddingTop: '12px', borderTop: '1px solid var(--border-subtle)' }}>
            <div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.5px' }}>DISTANCE</div>
              <div className="font-mono text-cyan" style={{ fontSize: '16px', fontWeight: 800 }}>
                {formatDistance(squad.canonicalRoute.distance)}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.5px' }}>EST. TIME</div>
              <div className="font-mono text-green" style={{ fontSize: '16px', fontWeight: 800 }}>
                {formatDuration(squad.canonicalRoute.duration)}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.5px' }}>CREW</div>
              <div className="font-mono" style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)' }}>
                {memberCount}
              </div>
            </div>
          </div>
        </div>

        {/* Member Name Input */}
        <div style={{ marginBottom: '24px', textAlign: 'left' }}>
          <label
            htmlFor="join-member-name"
            style={{ fontSize: '13px', fontWeight: 700, color: nameError ? 'var(--accent-red)' : 'var(--text-primary)', display: 'block', marginBottom: '8px' }}
          >
            Your Callsign / Name *
          </label>
          <input
            id="join-member-name"
            type="text"
            value={memberName}
            onChange={(e) => {
              setMemberName(e.target.value);
              if (nameError) setNameError(null);
            }}
            placeholder="Enter your name (e.g. Vishnu, Priya)"
            className="input-base"
            style={{
              width: '100%',
              fontSize: '15px',
              borderColor: nameError ? 'var(--accent-red)' : undefined
            }}
            autoFocus
            autoComplete="nickname"
          />
          {nameError ? (
            <p style={{ fontSize: '12px', color: 'var(--accent-red)', marginTop: '6px', fontWeight: 600 }}>
              {nameError}
            </p>
          ) : (
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '6px' }}>
              Your callsign will be visible to the convoy lead and all squad members.
            </p>
          )}
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '12px' }}>
          <button type="button" onClick={onCancel} className="btn-secondary" style={{ flex: 1, padding: '14px' }}>
            Cancel
          </button>
          <button
            type="button"
            onClick={handleJoinClick}
            className="btn-primary"
            style={{ flex: 2, padding: '14px', fontSize: '15px' }}
          >
            <Navigation size={18} />
            <span>Join Squad</span>
          </button>
        </div>
      </div>

      {/* Permission Explanation Modal */}
      {showPermissionDialog && (
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
        >
          <div
            className="surface-card animate-fade-in"
            style={{
              maxWidth: '440px',
              width: '100%',
              padding: '28px',
              textAlign: 'center',
              boxShadow: 'var(--shadow-xl)'
            }}
            role="dialog"
            aria-modal="true"
          >
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                backgroundColor: 'rgba(0, 217, 232, 0.12)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px',
                border: '1px solid rgba(0, 217, 232, 0.25)'
              }}
            >
              <ShieldCheck size={28} color="var(--accent-cyan)" />
            </div>

            <h3 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '8px' }}>
              Live GPS Sync Permission
            </h3>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '24px' }}>
              SquadMaps uses your device location to provide turn-by-turn guidance and render your live position alongside fellow convoy members.
              <br /><br />
              <strong style={{ color: 'var(--text-primary)' }}>Your location is never shared until you join.</strong> You can pause GPS broadcasting at any time during the trip.
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
                style={{ flex: 2, padding: '12px', fontSize: '15px' }}
              >
                {isJoining ? 'Joining...' : 'Allow & Join Squad'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
