import React, { useState } from 'react';
import { LatLng, Route, VehicleMode } from '../../types/navigation';
import { Place } from '../../types/places';
import { PlaceSearchBox } from '../places/PlaceSearchBox';
import { routingProvider } from '../../services/routing';
import { formatDistance, formatDuration } from '../../utils/format';
import { QRCodeSVG } from 'qrcode.react';
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
  Sparkles
} from 'lucide-react';

interface CreateSquadWizardProps {
  isOpen: boolean;
  onClose: () => void;
  userLocation: LatLng | null;
  onCreateSquad: (
    squadName: string,
    destination: string,
    destinationCoords: LatLng,
    mode: VehicleMode,
    selectedRoute: Route
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
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [squadName, setSquadName] = useState('');
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [vehicleMode, setVehicleMode] = useState<VehicleMode>('car');
  const [routes, setRoutes] = useState<Route[]>([]);
  const [selectedRouteIndex, setSelectedRouteIndex] = useState(0);
  const [isLoadingRoutes, setIsLoadingRoutes] = useState(false);
  const [createdSquadId, setCreatedSquadId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  // Step 1: Select Destination
  const handleSelectPlace = async (place: Place) => {
    setSelectedPlace(place);
    if (!squadName) {
      setSquadName(`Trip to ${place.name}`);
    }
    setStep(2);
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
    if (!selectedPlace || routes.length === 0) return;
    const chosenRoute = routes[selectedRouteIndex];

    const finalName = squadName.trim() || `Trip to ${selectedPlace.name}`;
    const squadId = await onCreateSquad(
      finalName,
      selectedPlace.name,
      selectedPlace.coordinates,
      vehicleMode,
      chosenRoute
    );

    setCreatedSquadId(squadId);
    setStep(5);
  };

  const inviteUrl = createdSquadId ? `${window.location.origin}/join/${createdSquadId}` : '';

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
              {step === 1 && 'Where are you heading?'}
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

        {/* STEP 1: Search Destination */}
        {step === 1 && (
          <div>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
              Search for cities, landmarks, addresses, hotels, restaurants, or airports.
            </p>
            <PlaceSearchBox
              userLocation={userLocation}
              onSelectPlace={handleSelectPlace}
              placeholder="Search destination (e.g. Goa, Airport, Hotel)..."
            />
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

        {/* STEP 4: Choose Route & Name Squad */}
        {step === 4 && (
          <div>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                Squad Name
              </label>
              <input
                type="text"
                value={squadName}
                onChange={(e) => setSquadName(e.target.value)}
                placeholder={`Trip to ${selectedPlace?.name}`}
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'var(--bg-card)',
                  border: '1px solid var(--border-medium)',
                  color: '#FFFFFF',
                  fontSize: '14px',
                  outline: 'none'
                }}
              />
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

            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setStep(2)} className="btn-secondary" style={{ flex: 1 }}>
                <ArrowLeft size={16} /> Back
              </button>
              <button onClick={handleFinalizeSquad} className="btn-primary" style={{ flex: 2 }}>
                <Sparkles size={18} /> Create Squad
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
