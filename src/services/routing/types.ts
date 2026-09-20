import { LatLng, Route, VehicleMode } from '../../types/navigation';

export interface IRouteProvider {
  name: string;
  calculateRoutes(
    origin: LatLng,
    destination: LatLng,
    mode: VehicleMode
  ): Promise<Route[]>;
}
