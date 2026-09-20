import { IRouteProvider } from './types';
import { osrmRoutingProvider } from './osrmRoutingProvider';
import { openRouteRoutingProvider } from './openRouteRoutingProvider';

const routingProviderMode = (import.meta.env.VITE_ROUTING_PROVIDER as string) || 'openrouteservice';
const openRouteKey = (import.meta.env.VITE_OPENROUTE_API_KEY as string) || '';

export const routingProvider: IRouteProvider =
  routingProviderMode === 'openrouteservice' && openRouteKey
    ? openRouteRoutingProvider
    : osrmRoutingProvider;

export { osrmRoutingProvider, openRouteRoutingProvider };
export * from './types';
