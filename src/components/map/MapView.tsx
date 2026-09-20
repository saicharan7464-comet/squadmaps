import React, { useEffect, useRef, useState } from 'react';
import { LatLng, Route } from '../../types/navigation';
import { SquadMember, RegroupPoint } from '../../types/squad';
import { Place } from '../../types/places';
import { formatDistance, formatSpeed } from '../../utils/format';
import { Navigation, Compass, Layers, Plus, Minus, MapPin, Flag } from 'lucide-react';
import L from 'leaflet';

interface MapViewProps {
  userLocation: LatLng | null;
  userHeading: number;
  userSpeed: number;
  route: Route | null;
  squadMembers: SquadMember[];
  destination: LatLng | null;
  destinationName?: string;
  regroupPoint?: RegroupPoint | null;
  suggestedPlaces?: Place[];
  focusedMemberId?: string | null;
  onMemberClick?: (member: SquadMember) => void;
  onMapClick?: (coords: LatLng) => void;
  isNavigating?: boolean;
}

export const MapView: React.FC<MapViewProps> = ({
  userLocation,
  userHeading,
  userSpeed,
  route,
  squadMembers,
  destination,
  destinationName,
  regroupPoint,
  suggestedPlaces = [],
  focusedMemberId,
  onMemberClick,
  onMapClick,
  isNavigating = false
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const routePolylineRef = useRef<L.Polyline | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);
  const memberMarkersRef = useRef<Map<string, L.Marker>>(new Map());
  const destMarkerRef = useRef<L.Marker | null>(null);
  const regroupMarkerRef = useRef<L.Marker | null>(null);
  const placeMarkersRef = useRef<L.Marker[]>([]);

  const [mapLayer, setMapLayer] = useState<'dark' | 'streets'>('dark');
  const tileLayerRef = useRef<L.TileLayer | null>(null);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    // Default center: India / User Location / Hyderabad
    const defaultCenter: [number, number] = userLocation
      ? [userLocation.lat, userLocation.lng]
      : [17.385, 78.4867];

    const map = L.map(mapContainerRef.current, {
      center: defaultCenter,
      zoom: 14,
      zoomControl: false,
      attributionControl: false
    });

    // Dark tiles via CartoDB Dark Matter
    const tileUrl =
      mapLayer === 'dark'
        ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
        : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

    const tiles = L.tileLayer(tileUrl, {
      maxZoom: 19,
      subdomains: 'abcd'
    }).addTo(map);

    tileLayerRef.current = tiles;
    mapInstanceRef.current = map;

    map.on('click', (e: L.LeafletMouseEvent) => {
      if (onMapClick) {
        onMapClick({ lat: e.latlng.lat, lng: e.latlng.lng });
      }
    });

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Switch Map Layer
  useEffect(() => {
    if (!mapInstanceRef.current || !tileLayerRef.current) return;
    mapInstanceRef.current.removeLayer(tileLayerRef.current);

    const tileUrl =
      mapLayer === 'dark'
        ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
        : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

    const tiles = L.tileLayer(tileUrl, {
      maxZoom: 19,
      subdomains: 'abcd'
    }).addTo(mapInstanceRef.current);

    tileLayerRef.current = tiles;
  }, [mapLayer]);

  // Update User Marker
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !userLocation) return;

    const userIconHtml = `
      <div style="position: relative; width: 44px; height: 44px; display: flex; align-items: center; justify-content: center;">
        <div style="position: absolute; width: 40px; height: 40px; border-radius: 50%; background: rgba(0, 230, 118, 0.2); animation: pulseGreen 2s infinite;"></div>
        <div style="position: absolute; width: 22px; height: 22px; border-radius: 50%; background: #00E676; border: 3px solid #FFFFFF; box-shadow: 0 0 12px rgba(0, 230, 118, 0.8); display: flex; align-items: center; justify-content: center; transform: rotate(${userHeading}deg);">
          <div style="width: 0; height: 0; border-left: 4px solid transparent; border-right: 4px solid transparent; border-bottom: 7px solid #0A0E17;"></div>
        </div>
      </div>
    `;

    const customIcon = L.divIcon({
      html: userIconHtml,
      className: 'user-pulse-marker',
      iconSize: [44, 44],
      iconAnchor: [22, 22]
    });

    if (userMarkerRef.current) {
      userMarkerRef.current.setLatLng([userLocation.lat, userLocation.lng]);
      userMarkerRef.current.setIcon(customIcon);
    } else {
      userMarkerRef.current = L.marker([userLocation.lat, userLocation.lng], {
        icon: customIcon,
        zIndexOffset: 1000
      }).addTo(map);
    }

    if (isNavigating) {
      map.panTo([userLocation.lat, userLocation.lng], { animate: true, duration: 0.5 });
    }
  }, [userLocation, userHeading, isNavigating]);

  // Update Squad Members Markers
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const currentMemberIds = new Set(squadMembers.map((m) => m.userId));

    // Remove old markers
    memberMarkersRef.current.forEach((marker, id) => {
      if (!currentMemberIds.has(id)) {
        map.removeLayer(marker);
        memberMarkersRef.current.delete(id);
      }
    });

    // Add/Update markers
    squadMembers.forEach((member) => {
      const isBehind = member.status === 'behind';
      const isArrived = member.status === 'arrived';
      const isOffline = !member.online || member.status === 'offline';
      const isPaused = member.locationSharingPaused;

      const markerColor = isOffline
        ? '#6B7280'
        : isBehind
        ? '#FF3D71'
        : isArrived
        ? '#00E676'
        : member.color || '#00F0FF';

      const statusTag = isPaused
        ? 'Location Paused'
        : isOffline
        ? 'Offline'
        : isArrived
        ? 'Arrived'
        : `${formatSpeed(member.speed)} • ${
            member.distanceFromUser !== undefined
              ? `${formatDistance(member.distanceFromUser)} away`
              : member.eta
          }`;

      const memberIconHtml = `
        <div style="position: relative; display: flex; flex-direction: column; align-items: center; cursor: pointer;">
          <!-- Speed & Distance Tag -->
          <div style="background: rgba(17, 24, 39, 0.9); border: 1px solid ${markerColor}; color: #FFFFFF; font-family: 'Space Grotesk', monospace; font-size: 11px; font-weight: 600; padding: 2px 7px; border-radius: 999px; white-space: nowrap; box-shadow: 0 2px 8px rgba(0,0,0,0.5); margin-bottom: 4px;">
            ${member.name.split(' ')[0]} (${statusTag})
          </div>

          <!-- Avatar Pin -->
          <div style="position: relative; width: 38px; height: 38px; display: flex; align-items: center; justify-content: center;">
            <div style="position: absolute; width: 38px; height: 38px; border-radius: 50%; background: ${markerColor}33; animation: pulseGlow 2.5s infinite;"></div>
            <div style="position: relative; width: 30px; height: 30px; border-radius: 50%; border: 2.5px solid ${markerColor}; overflow: hidden; background: #111827; box-shadow: 0 0 10px ${markerColor}88;">
              <img src="${member.profileImage}" alt="${member.name}" style="width: 100%; height: 100%; object-fit: cover;" />
            </div>
            ${
              member.heading !== undefined
                ? `<div style="position: absolute; top: -3px; width: 0; height: 0; border-left: 4px solid transparent; border-right: 4px solid transparent; border-bottom: 6px solid ${markerColor}; transform: rotate(${member.heading}deg);"></div>`
                : ''
            }
          </div>
        </div>
      `;

      const memberIcon = L.divIcon({
        html: memberIconHtml,
        className: 'squad-member-marker',
        iconSize: [120, 60],
        iconAnchor: [60, 45]
      });

      const existingMarker = memberMarkersRef.current.get(member.userId);
      if (existingMarker) {
        existingMarker.setLatLng([member.latitude, member.longitude]);
        existingMarker.setIcon(memberIcon);
      } else {
        const marker = L.marker([member.latitude, member.longitude], {
          icon: memberIcon,
          zIndexOffset: 800
        }).addTo(map);

        marker.on('click', () => {
          if (onMemberClick) onMemberClick(member);
        });

        memberMarkersRef.current.set(member.userId, marker);
      }
    });
  }, [squadMembers, onMemberClick]);

  // Focus on specific member when requested
  useEffect(() => {
    if (!focusedMemberId || !mapInstanceRef.current) return;
    const target = squadMembers.find((m) => m.userId === focusedMemberId);
    if (target) {
      mapInstanceRef.current.flyTo([target.latitude, target.longitude], 16, {
        animate: true,
        duration: 1.2
      });
    }
  }, [focusedMemberId, squadMembers]);

  // Update Route Polyline (Shared Canonical Path)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (routePolylineRef.current) {
      map.removeLayer(routePolylineRef.current);
      routePolylineRef.current = null;
    }

    if (route && route.polyline && route.polyline.length > 0) {
      const latLngs: [number, number][] = route.polyline.map((p) => [p.lat, p.lng]);

      // Glow backing line
      const glowLine = L.polyline(latLngs, {
        color: '#00F0FF',
        weight: 9,
        opacity: 0.35,
        lineCap: 'round',
        lineJoin: 'round'
      }).addTo(map);

      // Main core route line
      const mainLine = L.polyline(latLngs, {
        color: '#00D8F6',
        weight: 5,
        opacity: 0.95,
        lineCap: 'round',
        lineJoin: 'round'
      }).addTo(map);

      // Group into feature group for easy removal
      const group = L.featureGroup([glowLine, mainLine]).addTo(map);
      routePolylineRef.current = group as any;

      if (!isNavigating && route.bounds) {
        map.fitBounds(
          [
            [route.bounds.south, route.bounds.west],
            [route.bounds.north, route.bounds.east]
          ],
          { padding: [50, 50], animate: true }
        );
      }
    }
  }, [route, isNavigating]);

  // Update Destination Marker
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (destMarkerRef.current) {
      map.removeLayer(destMarkerRef.current);
      destMarkerRef.current = null;
    }

    if (destination) {
      const destHtml = `
        <div style="position: relative; display: flex; flex-direction: column; align-items: center;">
          <div style="background: rgba(17, 24, 39, 0.95); border: 1.5px solid #00F0FF; color: #FFFFFF; font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 6px; white-space: nowrap; margin-bottom: 4px; box-shadow: 0 2px 10px rgba(0,0,0,0.6);">
            🏁 ${destinationName || 'Destination'}
          </div>
          <div style="width: 32px; height: 32px; background: #00F0FF; border: 2px solid #FFFFFF; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(0, 240, 255, 0.6);">
            <div style="transform: rotate(45deg); font-size: 14px;">🏁</div>
          </div>
        </div>
      `;

      const destIcon = L.divIcon({
        html: destHtml,
        className: 'destination-marker',
        iconSize: [120, 50],
        iconAnchor: [60, 45]
      });

      destMarkerRef.current = L.marker([destination.lat, destination.lng], {
        icon: destIcon,
        zIndexOffset: 950
      }).addTo(map);
    }
  }, [destination, destinationName]);

  // Update Regroup Marker
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (regroupMarkerRef.current) {
      map.removeLayer(regroupMarkerRef.current);
      regroupMarkerRef.current = null;
    }

    if (regroupPoint) {
      const regroupHtml = `
        <div style="position: relative; display: flex; flex-direction: column; align-items: center;">
          <div style="background: #FFB300; color: #0A0E17; font-size: 11px; font-weight: 800; padding: 2px 8px; border-radius: 6px; white-space: nowrap; margin-bottom: 4px; box-shadow: 0 2px 10px rgba(255, 179, 0, 0.6);">
            📍 Regroup: ${regroupPoint.name}
          </div>
          <div style="width: 30px; height: 30px; border-radius: 50%; background: #FFB300; border: 2px solid #FFFFFF; display: flex; align-items: center; justify-content: center; animation: pulseAmber 2s infinite;">
            <span style="font-size: 14px;">🤝</span>
          </div>
        </div>
      `;

      const regroupIcon = L.divIcon({
        html: regroupHtml,
        className: 'regroup-marker',
        iconSize: [140, 50],
        iconAnchor: [70, 45]
      });

      regroupMarkerRef.current = L.marker([regroupPoint.coordinates.lat, regroupPoint.coordinates.lng], {
        icon: regroupIcon,
        zIndexOffset: 900
      }).addTo(map);
    }
  }, [regroupPoint]);

  // Update Suggested Places Markers
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Clear old place markers
    placeMarkersRef.current.forEach((m) => map.removeLayer(m));
    placeMarkersRef.current = [];

    suggestedPlaces.forEach((place) => {
      const placeHtml = `
        <div style="background: rgba(17, 24, 39, 0.9); border: 1px solid #8B5CF6; color: #FFFFFF; font-size: 10px; font-weight: 600; padding: 3px 6px; border-radius: 999px; display: flex; align-items: center; gap: 4px; box-shadow: 0 2px 8px rgba(0,0,0,0.5);">
          <span>📍</span>
          <span>${place.name.substring(0, 16)}</span>
        </div>
      `;

      const icon = L.divIcon({
        html: placeHtml,
        className: 'poi-marker',
        iconSize: [120, 24],
        iconAnchor: [60, 12]
      });

      const marker = L.marker([place.coordinates.lat, place.coordinates.lng], {
        icon,
        zIndexOffset: 600
      }).addTo(map);

      placeMarkersRef.current.push(marker);
    });
  }, [suggestedPlaces]);

  // Controls Handlers
  const handleRecenter = () => {
    if (mapInstanceRef.current && userLocation) {
      mapInstanceRef.current.flyTo([userLocation.lat, userLocation.lng], 16, {
        animate: true,
        duration: 0.8
      });
    }
  };

  const handleZoomIn = () => {
    mapInstanceRef.current?.zoomIn();
  };

  const handleZoomOut = () => {
    mapInstanceRef.current?.zoomOut();
  };

  const toggleLayer = () => {
    setMapLayer((prev) => (prev === 'dark' ? 'streets' : 'dark'));
  };

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden' }}>
      <div ref={mapContainerRef} className="map-container" />

      {/* Floating Map Controls */}
      <div
        style={{
          position: 'absolute',
          right: '16px',
          bottom: isNavigating ? '120px' : '90px',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          zIndex: 'var(--z-controls)'
        }}
      >
        <button
          className="btn-icon"
          onClick={handleRecenter}
          title="Recenter to my location"
          style={{ background: userLocation ? 'var(--bg-glass)' : 'rgba(17,24,39,0.5)' }}
        >
          <Navigation size={20} color="var(--accent-cyan)" />
        </button>

        <button className="btn-icon" onClick={toggleLayer} title="Toggle Map Style">
          <Layers size={20} />
        </button>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            background: 'var(--bg-glass)',
            borderRadius: 'var(--radius-full)',
            border: '1px solid var(--border-subtle)',
            overflow: 'hidden'
          }}
        >
          <button
            className="btn-icon"
            onClick={handleZoomIn}
            title="Zoom in"
            style={{ borderRadius: 0, border: 'none', height: '40px' }}
          >
            <Plus size={18} />
          </button>
          <div style={{ height: '1px', background: 'var(--border-subtle)', width: '100%' }} />
          <button
            className="btn-icon"
            onClick={handleZoomOut}
            title="Zoom out"
            style={{ borderRadius: 0, border: 'none', height: '40px' }}
          >
            <Minus size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};
