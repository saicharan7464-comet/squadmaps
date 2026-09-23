import React, { useState, useEffect } from 'react';
import { LatLng, Route, VehicleMode } from '../../types/navigation';
import { Place } from '../../types/places';
import { PlaceSearchBox } from '../places/PlaceSearchBox';
import { routingProvider } from '../../services/routing';
import { formatDistance, formatDuration } from '../../utils/format';
import { QRCodeSVG } from 'qrcode.react';
import { getInviteUrl } from '../../utils/inviteUrl';
import {
  Car,
  Bike,
  Footprints,
  Bus,
  Share2,
  Copy,
  Check,
  ArrowRight,
  ArrowLeft,
  X,
  Navigation,
  Flag,
  MapPin,
  Sparkles,
  User,
  Users
} from 'lucide-react';

import { useAuth } from '../../features/auth/AuthContext';

interface CreateSquadWizardProps {
  isOpen: boolean;
  onClose: () => void;
  userLocation: LatLng | null;
  onCreateSquad: (
    squadName: string,
    destination: string,
    destinationCoords: LatLng,
    mode: VehicleMode,
    selectedRoute: Route,
    hostName?: string
  ) => Promise<string>;
}

const VEHICLE_MODES: { id: VehicleMode; label: string; icon: any; desc: string }[] = [
  { id: 'car', label: 'Car', icon: Car, desc: 'Optimized for cars & highways' },
  { id: 'motorcycle', label: 'Motorcycle', icon: Bike, desc: 'Agile 2-wheeler navigation' },
  { id: 'bicycle', label: 'Bicycle', icon: Bike, desc: 'Dedicated bike-friendly routes' },
  { id: 'walking', label: 'Walking', icon: Footprints, desc: 'Pedestrian corridors & paths' },
  { id: 'transit', label: 'Transit', icon: Bus, desc: 'Public transit friendly' }
];

export const CreateSquadWizard: React.FC<CreateSquadWizardProps> = ({
  isOpen,
  onClose,
  userLocation,
  onCreateSquad
}) => {
  const { user } = useAuth();
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [squadName, setSquadName] = useState('');
  const [hostName, setHostName] = useState(user?.name || '');
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [vehicleMode, setVehicleMode] = useState<VehicleMode>('car');
  const [routes, setRoutes] = useState<Route[]>([]);
  const [selectedRouteIndex, setSelectedRouteIndex] = useState(0);
  const [isLoadingRoutes, setIsLoadingRoutes] = useState(false);
  const [createdSquadId, setCreatedSquadId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Synchronize hostName with user profile and reset wizard state when opened
  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setSelectedPlace(null);
      setCreatedSquadId(null);
      setSquadName('');
      setIsCreating(false);
      setErrorMessage(null);
      if (user?.name) {
        setHostName(user.name);
      }
    }
  }, [isOpen, user?.name]);

  if (!isOpen) return null;

  // Step 1: Select Destination
  const handleSelectPlace = async (place: Place) => {
    setSelectedPlace(place);
    if (!squadName.trim()) {
      setSquadName(`Trip to ${place.name}`);
    }
  };

  // Step 2: Select Vehicle & Calculate Routes
  const handleVehicleSelect = async (mode: VehicleMode) => {
    setVehicleMode(mode);
    if (!selectedPlace) return;

    setStep(3);
    setIsLoadingRoutes(true);

    const origin: LatLng = userLocation || { lat: 17.385, lng: 78.4867 }; // Default origin if GPS not yet granted
    try {
      const calculatedRoutes = await routingProvider.calculateRoutes(
        origin,
        selectedPlace.coordinates,
        mode
      );
      setRoutes(calculatedRoutes);
      setSelectedRouteIndex(0);
    } catch (err) {
      console.warn('Failed to calculate routes:', err);
    } finally {
      setIsLoadingRoutes(false);
      setStep(4);
    }
  };

  // Step 4: Finalize Squad Creation
  const handleFinalizeSquad = async () => {
    if (!selectedPlace || routes.length === 0 || isCreating) return;
    const chosenRoute = routes[selectedRouteIndex] || routes[0];
    if (!chosenRoute) return;

    setIsCreating(true);
    setErrorMessage(null);

    try {
      const finalName = squadName.trim() || `Trip to ${selectedPlace.name}`;
      const finalHostName = hostName.trim() || user?.name || 'Squad Leader';
      const squadId = await onCreateSquad(
        finalName,
        selectedPlace.name,
        selectedPlace.coordinates,
        vehicleMode,
        chosenRoute,
        finalHostName
      );

      if (squadId) {
        setCreatedSquadId(squadId);
        setStep(5);
      } else {
        throw new Error('Failed to generate Squad session. Please try again.');
      }
    } catch (err: any) {
      console.error('Squad creation error:', err);
      setErrorMessage(err?.message || 'Failed to create squad. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  const inviteUrl = createdSquadId ? getInviteUrl(createdSquadId) : '';

  const handleCopy = () => {
    navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleWhatsApp = () => {
    const text = encodeURIComponent(
      `🚗 Join our Squad on SquadNav for our trip to ${selectedPlace?.name}!\n\nTap to join & track our convoy: ${inviteUrl}`
    );
    window.open(`https://wa.me/?text=${text}`, '_blank');
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
          padding: '28px',
          backgroundColor: 'var(--bg-secondary)',
          border: '1px solid var(--border-medium)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div>
            <div style={{ fontSize: '12px', fontWeight: 800, color: 'var(--accent-cyan)', letterSpacing: '1px' }}>
              STEP {step} OF 5
            </div>
            <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#FFFFFF', marginTop: '2px' }}>
              {step === 1 && 'Create Your Squad'}
              {step === 2 && 'Choose your vehicle mode'}
              {step === 3 && 'Calculating best routes...'}
              {step === 4 && 'Select your squad route'}
              {step === 5 && 'Squad Ready! Invite your friends'}
            </h2>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', color: 'var(--text-muted)' }}>
            <X size={20} />
          </button>
        </div>

        {/* STEP 1: Host Name, Squad Name & Destination */}
        {step === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
              Set up your convoy identity and choose the destination everyone will navigate to together.
            </p>

            {/* Host Identity & Squad Name Card */}
            <div
              className="glass-card"
              style={{
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '14px',
                border: '1px solid var(--border-medium)',
                backgroundColor: 'rgba(21, 29, 44, 0.7)'
              }}
            >
              {/* Host Name Field */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 700, color: '#FFFFFF', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <User size={15} color="var(--accent-cyan)" />
                    <span>Your Host Name</span>
                  </label>
                  <span
                    style={{
                      fontSize: '10px',
                      fontWeight: 800,
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      padding: '2px 8px',
                      borderRadius: '999px',
                      backgroundColor: 'rgba(0, 240, 255, 0.15)',
                      color: 'var(--accent-cyan)',
                      border: '1px solid rgba(0, 240, 255, 0.3)'
                    }}
                  >
                    Convoy Lead
                  </span>
                </div>
                <input
                  type="text"
                  value={hostName}
                  onChange={(e) => setHostName(e.target.value)}
                  placeholder="Enter your name (e.g. Alex, Turbo Comet)"
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: 'var(--bg-primary)',
                    border: '1px solid var(--border-medium)',
                    color: '#FFFFFF',
                    fontSize: '14px',
                    fontWeight: 600,
                    outline: 'none',
                    transition: 'border-color 0.2s'
                  }}
                  onFocus={(e) => (e.target.style.borderColor = 'var(--accent-cyan)')}
                  onBlur={(e) => (e.target.style.borderColor = 'var(--border-medium)')}
                />
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                  This name will be visible to all members on the live GPS convoy map.
                </span>
              </div>

              {/* Squad Name Field */}
              <div>
                <label style={{ fontSize: '13px', fontWeight: 700, color: '#FFFFFF', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                  <Flag size={15} color="var(--accent-cyan)" />
                  <span>Squad / Trip Name</span>
                </label>
                <input
                  type="text"
                  value={squadName}
                  onChange={(e) => setSquadName(e.target.value)}
                  placeholder={selectedPlace ? `Trip to ${selectedPlace.name}` : "e.g. Hyderabad Airport Run or Goa Trip"}
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: 'var(--bg-primary)',
                    border: '1px solid var(--border-medium)',
                    color: '#FFFFFF',
                    fontSize: '14px',
                    fontWeight: 600,
                    outline: 'none',
                    transition: 'border-color 0.2s'
                  }}
                  onFocus={(e) => (e.target.style.borderColor = 'var(--accent-cyan)')}
                  onBlur={(e) => (e.target.style.borderColor = 'var(--border-medium)')}
                />
              </div>
            </div>

            {/* Destination Selection */}
            <div>
              <label style={{ fontSize: '13px', fontWeight: 700, color: '#FFFFFF', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                <MapPin size={15} color="var(--accent-cyan)" />
                <span>Destination</span>
              </label>

              {!selectedPlace ? (
                <div>
                  <PlaceSearchBox
                    userLocation={userLocation}
                    onSelectPlace={handleSelectPlace}
                    placeholder="Search city, airport, landmark, or venue..."
                    showCategories={false}
                  />
                </div>
              ) : (
                <div
                  className="glass-card animate-fade-in"
                  style={{
                    padding: '14px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    border: '1.5px solid var(--accent-cyan)',
                    backgroundColor: 'rgba(0, 240, 255, 0.08)',
                    borderRadius: 'var(--radius-sm)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                    <div
                      style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '10px',
                        backgroundColor: 'rgba(0, 240, 255, 0.2)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}
                    >
                      <MapPin size={22} color="var(--accent-cyan)" />
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: '15px',
                          fontWeight: 800,
                          color: '#FFFFFF',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {selectedPlace.name}
                      </div>
                      <div
                        style={{
                          fontSize: '12px',
                          color: 'var(--text-secondary)',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {selectedPlace.address}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setSelectedPlace(null)}
                    className="btn-secondary"
                    style={{ fontSize: '12px', padding: '6px 12px', flexShrink: 0 }}
                  >
                    Change
                  </button>
                </div>
              )}
            </div>

            {/* Bottom Continue Button */}
            <div style={{ marginTop: '4px' }}>
              <button
                type="button"
                disabled={!selectedPlace || !hostName.trim()}
                onClick={() => setStep(2)}
                className="btn-primary"
                style={{
                  width: '100%',
                  padding: '14px',
                  fontSize: '15px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
              >
                <span>Continue to Vehicle Selection</span>
                <ArrowRight size={18} />
              </button>

              {(!selectedPlace || !hostName.trim()) && (
                <p style={{ fontSize: '12px', color: 'var(--accent-amber)', textAlign: 'center', marginTop: '8px' }}>
                  {!hostName.trim()
                    ? '⚠️ Please enter your host name above to continue.'
                    : '📍 Please search and select a destination above to continue.'}
                </p>
              )}
            </div>
          </div>
        )}

        {/* STEP 2: Choose Vehicle Mode */}
        {step === 2 && selectedPlace && (
          <div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '10px 14px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'var(--bg-card)',
                marginBottom: '16px'
              }}
            >
              <Flag size={18} color="var(--accent-cyan)" />
              <div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: '#FFFFFF' }}>{selectedPlace.name}</div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{selectedPlace.address}</div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {VEHICLE_MODES.map((mode) => {
                const Icon = mode.icon;
                return (
                  <div
                    key={mode.id}
                    onClick={() => handleVehicleSelect(mode.id)}
                    className="glass-card"
                    style={{
                      padding: '14px 18px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      cursor: 'pointer',
                      border: vehicleMode === mode.id ? '1.5px solid var(--accent-cyan)' : '1px solid var(--border-subtle)'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                      <div
                        style={{
                          width: '42px',
                          height: '42px',
                          borderRadius: '50%',
                          backgroundColor: 'rgba(0, 240, 255, 0.1)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        <Icon size={22} color="var(--accent-cyan)" />
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '15px', color: '#FFFFFF' }}>{mode.label}</div>
                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{mode.desc}</div>
                      </div>
                    </div>
                    <ArrowRight size={18} color="var(--text-muted)" />
                  </div>
                );
              })}
            </div>

            <button
              onClick={() => setStep(1)}
              className="btn-secondary"
              style={{ marginTop: '16px', width: '100%', fontSize: '13px' }}
            >
              <ArrowLeft size={16} /> Back to Search
            </button>
          </div>
        )}

        {/* STEP 3: Loading Routes */}
        {step === 3 && (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                border: '3px solid var(--accent-cyan)',
                borderTopColor: 'transparent',
                animation: 'radarSweep 1s linear infinite',
                margin: '0 auto 16px'
              }}
            />
            <p style={{ color: 'var(--text-secondary)', fontSize: '15px' }}>
              Finding the fastest route to {selectedPlace?.name}...
            </p>
          </div>
        )}

        {/* STEP 4: Choose Route & Confirm Squad */}
        {step === 4 && (
          <div>
            {/* Convoy Summary Card */}
            <div
              className="glass-card"
              style={{
                padding: '14px 16px',
                marginBottom: '18px',
                border: '1px solid var(--border-medium)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                backgroundColor: 'rgba(0, 240, 255, 0.05)',
                borderRadius: 'var(--radius-sm)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                <div
                  style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '10px',
                    backgroundColor: 'rgba(0, 240, 255, 0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}
                >
                  <Users size={20} color="var(--accent-cyan)" />
                </div>
                <div style={{ minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: '15px',
                      fontWeight: 800,
                      color: '#FFFFFF',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {squadName.trim() || `Trip to ${selectedPlace?.name}`}
                  </div>
                  <div
                    style={{
                      fontSize: '12px',
                      color: 'var(--text-secondary)',
                      marginTop: '2px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    Host: <strong style={{ color: 'var(--accent-cyan)' }}>{hostName.trim() || user?.name || 'Squad Leader'}</strong> • {selectedPlace?.name}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setStep(1)}
                className="btn-secondary"
                style={{ fontSize: '12px', padding: '6px 12px', flexShrink: 0 }}
              >
                Edit Info
              </button>
            </div>

            <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '10px' }}>
              Route Options (Entire squad will follow this route)
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
              {routes.map((route, idx) => {
                const isSelected = selectedRouteIndex === idx;
                return (
                  <div
                    key={route.id}
                    onClick={() => setSelectedRouteIndex(idx)}
                    className="glass-card"
                    style={{
                      padding: '14px 18px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      cursor: 'pointer',
                      border: isSelected ? '2px solid var(--accent-cyan)' : '1px solid var(--border-subtle)',
                      backgroundColor: isSelected ? 'rgba(0, 240, 255, 0.08)' : 'var(--bg-glass-card)'
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 800, fontSize: '15px', color: '#FFFFFF' }}>{route.name}</div>
                      <div style={{ display: 'flex', gap: '8px', fontSize: '13px', marginTop: '2px' }}>
                        <span className="font-mono text-green" style={{ fontWeight: 700 }}>
                          {formatDuration(route.duration)}
                        </span>
                        <span style={{ color: 'var(--border-medium)' }}>•</span>
                        <span className="font-mono" style={{ color: 'var(--text-secondary)' }}>
                          {formatDistance(route.distance)}
                        </span>
                      </div>
                    </div>

                    {isSelected && (
                      <div
                        style={{
                          width: '24px',
                          height: '24px',
                          borderRadius: '50%',
                          backgroundColor: 'var(--accent-cyan)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        <Check size={16} color="var(--text-inverse)" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {errorMessage && (
              <div
                style={{
                  padding: '10px 14px',
                  backgroundColor: 'rgba(255, 61, 113, 0.15)',
                  border: '1px solid var(--accent-red)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--accent-red)',
                  fontSize: '13px',
                  marginBottom: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <span>⚠️ {errorMessage}</span>
              </div>
            )}

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => setStep(2)}
                className="btn-secondary"
                style={{ flex: 1 }}
                disabled={isCreating}
              >
                <ArrowLeft size={16} /> Back
              </button>
              <button
                onClick={handleFinalizeSquad}
                disabled={isCreating}
                className="btn-primary"
                style={{
                  flex: 2,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  opacity: isCreating ? 0.75 : 1
                }}
              >
                {isCreating ? (
                  <>
                    <div
                      style={{
                        width: '16px',
                        height: '16px',
                        border: '2px solid rgba(0, 0, 0, 0.25)',
                        borderTopColor: '#000000',
                        borderRadius: '50%',
                        animation: 'radarSweep 0.8s linear infinite'
                      }}
                    />
                    <span>Creating Squad...</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={18} />
                    <span>Create Squad</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* STEP 5: Success & Invite Sharing */}
        {step === 5 && (
          <div style={{ textAlign: 'center' }}>
            <div
              style={{
                width: '60px',
                height: '60px',
                borderRadius: '50%',
                backgroundColor: 'rgba(0, 230, 118, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px'
              }}
            >
              <Check size={32} color="var(--accent-green)" />
            </div>

            <h3 style={{ fontSize: '20px', fontWeight: 800, color: '#FFFFFF', marginBottom: '6px' }}>
              Squad #{createdSquadId} Created!
            </h3>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '20px' }}>
              Share this invitation with your friends so they can join your convoy and navigate together on the same path.
            </p>

            {/* QR Code */}
            <div style={{ background: '#FFFFFF', padding: '14px', borderRadius: '16px', display: 'inline-block', marginBottom: '16px' }}>
              <QRCodeSVG value={inviteUrl} size={160} level="M" />
            </div>

            <div
              className="glass-card font-mono"
              style={{
                padding: '10px 14px',
                fontSize: '13px',
                color: 'var(--accent-cyan)',
                marginBottom: '16px',
                wordBreak: 'break-all'
              }}
            >
              {inviteUrl}
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '10px', marginBottom: '12px' }}>
              <button onClick={handleCopy} className="btn-secondary" style={{ flex: 1, padding: '12px' }}>
                {copied ? <Check size={18} color="var(--accent-green)" /> : <Copy size={18} />}
                <span>{copied ? 'Copied' : 'Copy Link'}</span>
              </button>

              <button
                onClick={handleWhatsApp}
                className="btn-secondary"
                style={{
                  flex: 1,
                  padding: '12px',
                  backgroundColor: 'rgba(37, 211, 102, 0.12)',
                  borderColor: 'rgba(37, 211, 102, 0.4)',
                  color: '#25D366'
                }}
              >
                <Share2 size={18} />
                <span>WhatsApp</span>
              </button>
            </div>

            <button
              onClick={onClose}
              className="btn-primary"
              style={{ width: '100%', padding: '14px', fontSize: '15px' }}
            >
              <Navigation size={18} /> Start Navigation
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
