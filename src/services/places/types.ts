import { LatLng } from '../../types/navigation';
import { Place, PlaceCategory } from '../../types/places';

export interface IPlacesProvider {
  name: string;
  searchPlaces(query: string, near?: LatLng, category?: PlaceCategory): Promise<Place[]>;
  searchNearby(center: LatLng, category: PlaceCategory): Promise<Place[]>;
  reverseGeocode(point: LatLng): Promise<string>;
}
