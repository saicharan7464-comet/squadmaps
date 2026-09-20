import { LatLng, Route, RouteStep, VehicleMode } from '../../types/navigation';
import { IRouteProvider } from './types';
import { osrmRoutingProvider } from './osrmRoutingProvider';

export class OpenRouteRoutingProvider implements IRouteProvider {
  name = 'OpenRouteService';

  private get apiKey(): string {
    return (import.meta.env.VITE_OPENROUTE_API_KEY as string) || '';
  }

  private getProfile(mode: VehicleMode): string {
    switch (mode) {
      case 'walking':
        return 'foot-walking';
      case 'bicycle':
        return 'cycling-regular';
      case 'motorcycle':
      case 'car':
      case 'transit':
      default:
        return 'driving-car';
    }
  }

  private getManeuverDetails(type: number): { type: string; modifier?: string } {
    switch (type) {
      case 0:
        return { type: 'turn', modifier: 'left' };
      case 1:
        return { type: 'turn', modifier: 'right' };
      case 2:
        return { type: 'turn', modifier: 'sharp left' };
      case 3:
        return { type: 'turn', modifier: 'sharp right' };
      case 4:
        return { type: 'turn', modifier: 'slight left' };
      case 5:
        return { type: 'turn', modifier: 'slight right' };
      case 6:
        return { type: 'continue', modifier: 'straight' };
      case 7:
        return { type: 'roundabout', modifier: 'enter' };
      case 8:
        return { type: 'roundabout', modifier: 'exit' };
      case 9:
        return { type: 'turn', modifier: 'u-turn' };
      case 10:
        return { type: 'arrive', modifier: 'destination' };
      case 11:
        return { type: 'depart', modifier: 'depart' };
      case 12:
        return { type: 'keep', modifier: 'left' };
      case 13:
        return { type: 'keep', modifier: 'right' };
      default:
        return { type: 'turn' };
    }
  }

  async calculateRoutes(
    origin: LatLng,
    destination: LatLng,
    mode: VehicleMode
  ): Promise<Route[]> {
    const key = this.apiKey;
    if (!key) {
      console.warn('VITE_OPENROUTE_API_KEY is not set. Falling back to OSRM.');
      return osrmRoutingProvider.calculateRoutes(origin, destination, mode);
    }

    const profile = this.getProfile(mode);
    const url = `https://api.heigit.org/openrouteservice/v2/directions/${profile}/geojson`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': key,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          coordinates: [
            [origin.lng, origin.lat],
            [destination.lng, destination.lat]
          ],
          instructions: true,
          geometry: true,
          elevation: false
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.warn(`OpenRouteService error (${response.status}): ${errorText}`);
        return osrmRoutingProvider.calculateRoutes(origin, destination, mode);
      }

      const data = await response.json();
      if (!data.features || data.features.length === 0) {
        return osrmRoutingProvider.calculateRoutes(origin, destination, mode);
      }

      return data.features.map((feature: any, index: number): Route => {
        const rawCoords: [number, number][] = feature.geometry?.coordinates || [];
        const polyline: LatLng[] = rawCoords.map((coord) => ({
          lat: coord[1],
          lng: coord[0]
        }));

        const summary = feature.properties?.summary || {};
        const distance = summary.distance || 0; // meters
        const duration = summary.duration || 0; // seconds

        const steps: RouteStep[] = [];
        const segment = feature.properties?.segments?.[0];
        if (segment?.steps) {
          segment.steps.forEach((step: any) => {
            const [startIdx, endIdx] = step.way_points || [0, 0];
            const startCoord = rawCoords[startIdx] || [origin.lng, origin.lat];
            const endCoord = rawCoords[endIdx] || [destination.lng, destination.lat];

            const maneuverInfo = this.getManeuverDetails(step.type);
            const instruction = step.instruction || 'Continue';

            steps.push({
              instruction,
              distance: step.distance || 0,
              duration: step.duration || 0,
              startLocation: {
                lat: startCoord[1],
                lng: startCoord[0]
              },
              endLocation: {
                lat: endCoord[1],
                lng: endCoord[0]
              },
              maneuver: {
                type: maneuverInfo.type,
                modifier: maneuverInfo.modifier,
                instruction
              },
              streetName: step.name && step.name !== '-' ? step.name : ''
            });
          });
        }

        // Calculate bounding box
        let north = -90, south = 90, east = -180, west = 180;
        polyline.forEach((p) => {
          if (p.lat > north) north = p.lat;
          if (p.lat < south) south = p.lat;
          if (p.lng > east) east = p.lng;
          if (p.lng < west) west = p.lng;
        });

        const routeName = steps.find((s) => s.streetName)?.streetName
          ? `Via ${steps.find((s) => s.streetName)?.streetName}`
          : `Route ${index + 1}`;

        return {
          id: `ors-route-${index + 1}-${Date.now()}`,
          name: routeName,
          distance,
          duration,
          summary: routeName,
          polyline,
          steps,
          bounds: { north, south, east, west }
        };
      });
    } catch (err) {
      console.warn('OpenRouteService request failed, falling back to OSRM:', err);
      return osrmRoutingProvider.calculateRoutes(origin, destination, mode);
    }
  }
}

export const openRouteRoutingProvider = new OpenRouteRoutingProvider();
