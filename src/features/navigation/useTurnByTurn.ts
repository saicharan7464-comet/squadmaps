import { useState, useEffect, useRef } from 'react';
import { LatLng, Route, RouteStep } from '../../types/navigation';
import { haversineDistance, isPointOffRoute, findNearestPointOnRoute } from '../../utils/geo';
import { formatETA } from '../../utils/format';
import { voiceGuidance } from '../../services/speech/voiceGuidanceService';
import { soundService } from '../../services/audio/soundService';

interface UseTurnByTurnProps {
  route: Route | null;
  currentLocation: LatLng | null;
  currentSpeed: number; // km/h
  isNavigating: boolean;
  onRerouteNeeded?: () => void;
  onArrival?: () => void;
}

export function useTurnByTurn({
  route,
  currentLocation,
  currentSpeed,
  isNavigating,
  onRerouteNeeded,
  onArrival
}: UseTurnByTurnProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [distanceToNextStep, setDistanceToNextStep] = useState(0);
  const [distanceRemaining, setDistanceRemaining] = useState(0);
  const [durationRemaining, setDurationRemaining] = useState(0);
  const [etaString, setEtaString] = useState('');
  const [isOffRoute, setIsOffRoute] = useState(false);
  const [isArrived, setIsArrived] = useState(false);
  const [voiceMuted, setVoiceMuted] = useState(false);

  const announcedStepsRef = useRef<Set<number>>(new Set());
  const offRouteCounterRef = useRef(0);
  const hasArrivedRef = useRef(false);

  // Reset when route or navigation changes
  useEffect(() => {
    setCurrentStepIndex(0);
    announcedStepsRef.current.clear();
    hasArrivedRef.current = false;
    setIsArrived(false);
    setIsOffRoute(false);
    offRouteCounterRef.current = 0;

    if (route) {
      setDistanceRemaining(route.distance);
      setDurationRemaining(route.duration);
      setEtaString(formatETA(route.duration));
    }
  }, [route?.id, isNavigating]);

  // Main navigation loop on location update
  useEffect(() => {
    if (!isNavigating || !route || !currentLocation) return;

    const steps = route.steps;
    if (!steps || steps.length === 0) return;

    // 1. Check if user has arrived at final destination (within 60 meters of final point)
    const destinationPoint = route.polyline[route.polyline.length - 1];
    const distToDestination = haversineDistance(currentLocation, destinationPoint);

    if (distToDestination <= 60 && !hasArrivedRef.current) {
      hasArrivedRef.current = true;
      setIsArrived(true);
      soundService.playArrivalFanfare();
      voiceGuidance.speak('You have reached your destination.');
      if (onArrival) onArrival();
      return;
    }

    // 2. Check if user is off route (threshold: 60m)
    const off = isPointOffRoute(currentLocation, route.polyline, 60);
    if (off) {
      offRouteCounterRef.current += 1;
      // Require 2 consecutive off-route ticks to avoid false GPS noise triggers
      if (offRouteCounterRef.current >= 2 && !isOffRoute) {
        setIsOffRoute(true);
        soundService.playAlertChime();
        voiceGuidance.speak('Recalculating route...');
        if (onRerouteNeeded) {
          onRerouteNeeded();
        }
      }
    } else {
      offRouteCounterRef.current = 0;
      if (isOffRoute) setIsOffRoute(false);
    }

    // 3. Find progress along steps
    const currentStep = steps[currentStepIndex];
    if (currentStep) {
      const distToStepEnd = haversineDistance(currentLocation, currentStep.endLocation);
      setDistanceToNextStep(Math.round(distToStepEnd));

      // Advance to next step if user is within 25m of current step's end
      if (distToStepEnd <= 25 && currentStepIndex < steps.length - 1) {
        const nextIndex = currentStepIndex + 1;
        setCurrentStepIndex(nextIndex);
        soundService.playTurnChime();
        const nextManeuver = steps[nextIndex];
        if (nextManeuver) {
          voiceGuidance.speak(nextManeuver.instruction);
        }
      }

      // Voice prompt when approaching turn (e.g. 250m before maneuver)
      if (
        distToStepEnd <= 250 &&
        distToStepEnd > 50 &&
        !announcedStepsRef.current.has(currentStepIndex)
      ) {
        announcedStepsRef.current.add(currentStepIndex);
        soundService.playTurnChime();
        voiceGuidance.speak(`In ${Math.round(distToStepEnd)} meters, ${currentStep.instruction}`);
      }
    }

    // 4. Calculate total remaining distance from nearest point to end of route
    const { index: nearestIdx } = findNearestPointOnRoute(currentLocation, route.polyline);
    let remainingMeters = 0;
    for (let i = nearestIdx; i < route.polyline.length - 1; i++) {
      remainingMeters += haversineDistance(route.polyline[i], route.polyline[i + 1]);
    }
    setDistanceRemaining(Math.round(remainingMeters));

    // Dynamic duration calculation: if traveling at > 10 km/h, use current speed, else route ratio
    let remainingSeconds = route.duration;
    if (currentSpeed > 10) {
      const speedMps = (currentSpeed * 1000) / 3600;
      remainingSeconds = Math.round(remainingMeters / speedMps);
    } else {
      const progressRatio = remainingMeters / (route.distance || 1);
      remainingSeconds = Math.round(route.duration * progressRatio);
    }
    setDurationRemaining(remainingSeconds);
    setEtaString(formatETA(remainingSeconds));
  }, [
    currentLocation,
    currentSpeed,
    isNavigating,
    route,
    currentStepIndex,
    isOffRoute,
    onRerouteNeeded,
    onArrival
  ]);

  const toggleVoiceMute = () => {
    const next = !voiceMuted;
    setVoiceMuted(next);
    voiceGuidance.setMuted(next);
  };

  const currentStep = route?.steps[currentStepIndex] || null;
  const nextStep = route?.steps[currentStepIndex + 1] || null;

  return {
    currentStepIndex,
    currentStep,
    nextStep,
    distanceToNextStep,
    distanceRemaining,
    durationRemaining,
    etaString,
    isOffRoute,
    isArrived,
    voiceMuted,
    toggleVoiceMute
  };
}
