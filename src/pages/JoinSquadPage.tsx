import React, { useState, useEffect } from 'react';
import { Squad } from '../types/squad';
import { squadDataService } from '../services/firebase/squadDataService';
import { formatDistance, formatDuration } from '../utils/format';
import { useAuth } from '../features/auth/AuthContext';
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
  const { user } = useAuth();
  const [squad, setSquad] = useState<Squad | null>(null);
  const [memberCount, setMemberCount] = useState<number>(1);
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
    setShowPermissionDialog(true);
  };

  const handleConfirmJoinWithLocation = async () => {
    setIsJoining(true);
    try {
      // Request location permission
      await onRequestLocation();
      if (squad) {
        onJoinSuccess(squad);
      }
    } catch (err) {
      console.warn('Location permission handled:', err);
      if (squad) {
        onJoinSuccess(squad);
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
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'var(--bg-primary)',
        padding: '20px',
        position: 'relative'
      }}
    >
      <div
        className="glass-panel animate-fade-in"
        style={{
          maxWidth: '480px',
          width: '100%',
          padding: '32px',
          backgroundColor: 'var(--bg-secondary)',
          border: '1px solid var(--border-medium)',
          boxShadow: 'var(--shadow-lg)'
        }}
      >
        {/* Header Badge */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '4px 10px',
            borderRadius: '999px',
            backgroundColor: 'rgba(0, 240, 255, 0.12)',
            color: 'var(--accent-cyan)',
            fontSize: '12px',
            fontWeight: 800,
            letterSpacing: '0.5px',
            marginBottom: '16px'
          }}
        >
          <span>🚗 SQUAD INVITATION</span>
        </div>

        <h1 style={{ fontSize: '26px', fontWeight: 800, color: '#FFFFFF', lineHeight: 1.2 }}>
          {squad.name}
        </h1>
        <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginTop: '4px', marginBottom: '24px' }}>
          Hosted by <strong>{squad.hostName}</strong>
        </p>

        {/* Squad Details Card */}
        <div
          className="glass-card"
          style={{
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
            marginBottom: '24px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Flag size={20} color="var(--accent-cyan)" style={{ flexShrink: 0 }} />
            <div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>
                Destination
              </div>
              <div style={{ fontSize: '16px', fontWeight: 800, color: '#FFFFFF' }}>
                {squad.destination}
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', paddingTop: '10px', borderTop: '1px solid var(--border-subtle)' }}>
            <div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700 }}>DISTANCE</div>
              <div className="font-mono text-cyan" style={{ fontSize: '16px', fontWeight: 800 }}>
                {formatDistance(squad.canonicalRoute.distance)}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700 }}>EST. TIME</div>
              <div className="font-mono text-green" style={{ fontSize: '16px', fontWeight: 800 }}>
                {formatDuration(squad.canonicalRoute.duration)}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700 }}>MEMBERS</div>
              <div className="font-mono" style={{ fontSize: '16px', fontWeight: 800, color: '#FFFFFF' }}>
                {memberCount}
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '12px' }}>
          <button onClick={onCancel} className="btn-secondary" style={{ flex: 1, padding: '14px' }}>
            Cancel
          </button>
          <button
            onClick={handleJoinClick}
            className="btn-primary"
            style={{ flex: 2, padding: '14px', fontSize: '16px' }}
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
            backgroundColor: 'rgba(0,0,0,0.8)',
            backdropFilter: 'blur(8px)',
            zIndex: 'var(--z-modal)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px'
          }}
        >
          <div
            className="glass-panel animate-fade-in"
            style={{
              maxWidth: '440px',
              width: '100%',
              padding: '28px',
              backgroundColor: 'var(--bg-secondary)',
              border: '1px solid var(--border-medium)',
              textAlign: 'center'
            }}
          >
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                backgroundColor: 'rgba(0, 240, 255, 0.12)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px'
              }}
            >
              <ShieldCheck size={32} color="var(--accent-cyan)" />
            </div>

            <h3 style={{ fontSize: '20px', fontWeight: 800, color: '#FFFFFF', marginBottom: '8px' }}>
              Location Permission
            </h3>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '24px' }}>
              SquadNav uses your device's location to provide turn-by-turn navigation and share your live position with your squad members on the shared route.
              <br /><br />
              <strong style={{ color: '#FFFFFF' }}>Your location is never shared until you join.</strong> You can pause GPS sharing anytime.
            </p>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => setShowPermissionDialog(false)}
                className="btn-secondary"
                style={{ flex: 1, padding: '12px' }}
              >
                Cancel
              </button>
              <button
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
