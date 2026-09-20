import { LatLng, Route, RouteStep, VehicleMode } from '../../types/navigation';
import { IRouteProvider } from './types';

export class OSRMRoutingProvider implements IRouteProvider {
  name = 'OSRM';

  private getProfile(mode: VehicleMode): string {
    switch (mode) {
      case 'walking':
        return 'walking';
      case 'bicycle':
        return 'cycling';
      case 'motorcycle':
      case 'car':
      case 'transit':
      default:
        return 'driving';
    }
  }

  async calculateRoutes(
    origin: LatLng,
    destination: LatLng,
    mode: VehicleMode
  ): Promise<Route[]> {
    const profile = this.getProfile(mode);
    const coordinates = `${origin.lng},${origin.lat};${destination.lng},${destination.lat}`;
    const url = `https://router.project-osrm.org/route/v1/${profile}/${coordinates}?overview=full&geometries=geojson&steps=true&alternatives=true`;

    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`OSRM API error: ${response.statusText}`);
      }

      const data = await response.json();
      if (!data.routes || data.routes.length === 0) {
        throw new Error('No routes found');
      }

      return data.routes.map((rawRoute: any, index: number): Route => {
        // Convert [lng, lat] to LatLng { lat, lng }
        const polyline: LatLng[] = rawRoute.geometry.coordinates.map((coord: [number, number]) => ({
          lat: coord[1],
          lng: coord[0]
        }));

        const steps: RouteStep[] = [];
        if (rawRoute.legs && rawRoute.legs.length > 0) {
          rawRoute.legs.forEach((leg: any) => {
            if (leg.steps) {
              leg.steps.forEach((step: any) => {
                const maneuver = step.maneuver || {};
                let instruction = maneuver.instruction;
                if (!instruction) {
                  const type = maneuver.type || 'turn';
                  const modifier = maneuver.modifier ? ` ${maneuver.modifier}` : '';
                  const street = step.name ? ` onto ${step.name}` : '';
                  instruction = `${type}${modifier}${street}`;
                  // Capitalize first letter
                  instruction = instruction.charAt(0).toUpperCase() + instruction.slice(1);
                }

                steps.push({
                  instruction,
                  distance: step.distance || 0,
                  duration: step.duration || 0,
                  startLocation: {
                    lat: maneuver.location ? maneuver.location[1] : 0,
                    lng: maneuver.location ? maneuver.location[0] : 0
                  },
                  endLocation: {
                    lat: step.maneuver?.location ? step.maneuver.location[1] : 0,
                    lng: step.maneuver?.location ? step.maneuver.location[0] : 0
                  },
                  maneuver: {
                    type: maneuver.type || 'turn',
                    modifier: maneuver.modifier,
                    instruction
                  },
                  streetName: step.name || ''
                });
              });
            }
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

        const routeName = rawRoute.legs?.[0]?.summary
          ? `Via ${rawRoute.legs[0].summary}`
          : `Route ${index + 1}`;

        return {
          id: `route-${index + 1}-${Date.now()}`,
          name: routeName,
          distance: rawRoute.distance, // meters
          duration: rawRoute.duration, // seconds
          summary: rawRoute.legs?.[0]?.summary || routeName,
          polyline,
          steps,
          bounds: { north, south, east, west }
        };
      });
    } catch (err) {
      console.warn('OSRM routing request failed:', err);
      // Fallback to straight-line route if offline or server error
      const distance = Math.round(
        Math.hypot(destination.lat - origin.lat, destination.lng - origin.lng) * 111000
      );
      const duration = Math.round(distance / 13.8); // ~50 km/h in m/s

      return [
        {
          id: 'route-fallback-1',
          name: 'Direct Route',
          distance,
          duration,
          summary: 'Direct Path',
          polyline: [origin, destination],
          steps: [
            {
              instruction: 'Head towards destination',
              distance,
              duration,
              startLocation: origin,
              endLocation: destination,
              maneuver: {
                type: 'depart',
                instruction: 'Head towards destination'
              }
            }
          ]
        }
      ];
    }
  }
}

export const osrmRoutingProvider = new OSRMRoutingProvider();
