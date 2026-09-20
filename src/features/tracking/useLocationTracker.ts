import { useState, useEffect, useRef, useCallback } from 'react';
import { LatLng } from '../../types/navigation';
import { haversineDistance, calculateBearing } from '../../utils/geo';

export interface LocationState {
  coordinates: LatLng | null;
  speed: number; // km/h
  heading: number; // degrees (0-360)
  accuracy: number; // meters
  timestamp: number;
  isStationary: boolean;
  permissionGranted: boolean;
  permissionDenied: boolean;
  permissionError: string | null;
  isSharingPaused: boolean;
  isSimulating: boolean;
}

export function useLocationTracker(initialCoords?: LatLng) {
  const [state, setState] = useState<LocationState>({
    coordinates: initialCoords || null,
    speed: 0,
    heading: 0,
    accuracy: 10,
    timestamp: Date.now(),
    isStationary: true,
    permissionGranted: false,
    permissionDenied: false,
    permissionError: null,
    isSharingPaused: false,
    isSimulating: false
  });

  const prevCoordsRef = useRef<LatLng | null>(initialCoords || null);
  const prevTimeRef = useRef<number>(Date.now());
  const watchIdRef = useRef<number | null>(null);
  const simulationTimerRef = useRef<any>(null);

  // Toggle Location Sharing Privacy
  const togglePauseSharing = useCallback(() => {
    setState((prev) => ({ ...prev, isSharingPaused: !prev.isSharingPaused }));
  }, []);

  // Request & Watch Location
  const startTracking = useCallback(() => {
    if (typeof window === 'undefined' || !('geolocation' in navigator)) {
      setState((prev) => ({
        ...prev,
        permissionDenied: true,
        permissionError: 'Geolocation API not supported by your browser.'
      }));
      return;
    }

    // Clear existing watch if any
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
    }

    const handleSuccess = (position: GeolocationPosition) => {
      const { latitude, longitude, speed: rawSpeed, heading: rawHeading, accuracy } = position.coords;
      const currentCoords: LatLng = { lat: latitude, lng: longitude };
      const currentTime = position.timestamp || Date.now();

      let speedKmh = 0;
      let calculatedHeading = state.heading;
      let isStationary = true;

      // Geolocation speed is in meters/second, convert to km/h (1 m/s = 3.6 km/h)
      // Check device reported speed first
      if (rawSpeed !== null && rawSpeed !== undefined && !isNaN(rawSpeed)) {
        if (rawSpeed >= 0.5) {
          // Device is moving
          speedKmh = rawSpeed * 3.6;
          isStationary = false;
        } else {
          // Device is stationary
          speedKmh = 0;
          isStationary = true;
        }
      } else if (prevCoordsRef.current) {
        // Fallback: calculate speed from coordinate delta if rawSpeed is unavailable
        const distMoved = haversineDistance(prevCoordsRef.current, currentCoords);
        const timeDiffSec = (currentTime - prevTimeRef.current) / 1000;

        // If moved more than 3 meters and within reasonable time, calculate speed
        if (distMoved >= 3 && timeDiffSec > 0) {
          const calculatedSpeed = (distMoved / timeDiffSec) * 3.6;
          if (calculatedSpeed >= 1.8) {
            speedKmh = calculatedSpeed;
            isStationary = false;
          } else {
            speedKmh = 0;
            isStationary = true;
          }
        } else {
          speedKmh = 0;
          isStationary = true;
        }
      }

      if (prevCoordsRef.current && !isStationary) {
        calculatedHeading = calculateBearing(prevCoordsRef.current, currentCoords);
      }

      if (rawHeading !== null && rawHeading !== undefined && !isNaN(rawHeading) && rawHeading >= 0) {
        calculatedHeading = rawHeading;
      }

      prevCoordsRef.current = currentCoords;
      prevTimeRef.current = currentTime;

      setState((prev) => ({
        ...prev,
        coordinates: currentCoords,
        speed: Math.round(speedKmh),
        heading: Math.round(calculatedHeading),
        accuracy: Math.round(accuracy),
        timestamp: currentTime,
        isStationary,
        permissionGranted: true,
        permissionDenied: false,
        permissionError: null
      }));
    };

    const handleError = (error: GeolocationPositionError) => {
      let errorMsg = 'Failed to detect location.';
      if (error.code === error.PERMISSION_DENIED) {
        errorMsg = 'Location permission was denied. Please allow location access in your browser settings to enable real-time navigation and squad tracking.';
      } else if (error.code === error.POSITION_UNAVAILABLE) {
        errorMsg = 'GPS signal is currently unavailable. Ensure your device has location services enabled.';
      } else if (error.code === error.TIMEOUT) {
        errorMsg = 'Location request timed out. Retrying...';
      }

      setState((prev) => ({
        ...prev,
        permissionDenied: error.code === error.PERMISSION_DENIED,
        permissionError: errorMsg
      }));
    };

    const watchId = navigator.geolocation.watchPosition(handleSuccess, handleError, {
      enableHighAccuracy: true,
      maximumAge: 2000,
      timeout: 10000
    });

    watchIdRef.current = watchId;
  }, [state.heading]);

  // Simulation Mode for testing convoy navigation on desktop
  const startSimulation = useCallback((routeCoordinates: LatLng[], speedKmh = 60) => {
    if (!routeCoordinates || routeCoordinates.length === 0) return;

    if (watchIdRef.current !== null && typeof navigator !== 'undefined') {
      navigator.geolocation.clearWatch(watchIdRef.current);
    }
    if (simulationTimerRef.current) {
      clearInterval(simulationTimerRef.current);
    }

    let currentIndex = 0;
    const intervalMs = 1000;
    // Calculate meters to advance per tick: speed (km/h) / 3.6
    const metersPerSecond = speedKmh / 3.6;

    setState((prev) => ({
      ...prev,
      isSimulating: true,
      permissionGranted: true,
      permissionDenied: false,
      speed: speedKmh,
      coordinates: routeCoordinates[0],
      isStationary: false
    }));

    simulationTimerRef.current = setInterval(() => {
      if (currentIndex < routeCoordinates.length - 1) {
        const current = routeCoordinates[currentIndex];
        const next = routeCoordinates[currentIndex + 1];
        const distToNext = haversineDistance(current, next);

        if (distToNext <= metersPerSecond) {
          currentIndex++;
        }

        const heading = calculateBearing(current, next);
        setState((prev) => ({
          ...prev,
          coordinates: routeCoordinates[currentIndex],
          speed: speedKmh,
          heading,
          timestamp: Date.now(),
          isStationary: false
        }));
      } else {
        // Arrived
        setState((prev) => ({
          ...prev,
          speed: 0,
          isStationary: true,
          coordinates: routeCoordinates[routeCoordinates.length - 1]
        }));
        clearInterval(simulationTimerRef.current);
      }
    }, intervalMs);
  }, []);

  const stopSimulation = useCallback(() => {
    if (simulationTimerRef.current) {
      clearInterval(simulationTimerRef.current);
      simulationTimerRef.current = null;
    }
    setState((prev) => ({ ...prev, isSimulating: false }));
    startTracking();
  }, [startTracking]);

  // Initialize tracking on mount
  useEffect(() => {
    startTracking();
    return () => {
      if (watchIdRef.current !== null && typeof navigator !== 'undefined') {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
      if (simulationTimerRef.current) {
        clearInterval(simulationTimerRef.current);
      }
    };
  }, [startTracking]);

  return {
    ...state,
    startTracking,
    togglePauseSharing,
    startSimulation,
    stopSimulation
  };
}
