import { useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface RoutePoint {
  lat: number;
  lng: number;
}

export interface TrafficIncident {
  id: string;
  type: string;
  severity: number;
  description: string;
  from: RoutePoint;
  to: RoutePoint;
  delay: number;
}

export interface CalculatedRoute {
  key: string;
  name: string;
  coordinates: RoutePoint[];
  distance: number;
  estimatedTime: number;
  trafficDelay: number;
  congestion: number;
  algorithm: 'dijkstra' | 'astar';
  incidents: TrafficIncident[];
  color: string;
  isActive: boolean;
}

export interface DynamicRoutingState {
  currentRoute: CalculatedRoute | null;
  alternateRoutes: CalculatedRoute[];
  vehiclePosition: RoutePoint | null;
  vehicleProgress: number; // 0-100
  isRerouting: boolean;
  lastUpdate: Date | null;
  error: string | null;
}

const ROUTE_COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444'];

export function useDynamicRouting(
  origin: RoutePoint,
  destination: RoutePoint
) {
  const [state, setState] = useState<DynamicRoutingState>({
    currentRoute: null,
    alternateRoutes: [],
    vehiclePosition: origin,
    vehicleProgress: 0,
    isRerouting: false,
    lastUpdate: null,
    error: null,
  });

  const vehicleProgressRef = useRef(0);
  const isMonitoringRef = useRef(true);

  // Calculate route using TomTom Routing API
  const calculateRoute = useCallback(async (
    from: RoutePoint,
    to: RoutePoint,
    routeKey: string,
    avoidAreas: RoutePoint[] = []
  ): Promise<CalculatedRoute | null> => {
    try {
      const { data, error } = await supabase.functions.invoke('calculate-route', {
        body: { origin: from, destination: to, routeKey, avoidAreas }
      });

      if (error) {
        console.error('Route calculation error:', error);
        return null;
      }

      // Fetch traffic data for this route
      const { data: trafficData } = await supabase.functions.invoke('traffic-data', {
        body: { 
          coordinates: data.coordinates.slice(0, 10), // Sample points for traffic
          routeKey 
        }
      });

      return {
        key: routeKey,
        name: routeKey === 'primary' ? 'Primary Route' : `Alternate ${routeKey}`,
        coordinates: data.coordinates.map((c: any) => ({ lat: c.lat, lng: c.lng })),
        distance: data.distance,
        estimatedTime: data.estimatedTime,
        trafficDelay: data.trafficDelay,
        congestion: trafficData?.metrics?.avgDensity || 0,
        algorithm: data.algorithm,
        incidents: trafficData?.incidents || [],
        color: ROUTE_COLORS[0],
        isActive: true,
      };
    } catch (err) {
      console.error('Failed to calculate route:', err);
      return null;
    }
  }, []);

  // Fetch traffic for current route segment
  const checkRouteTraffic = useCallback(async (route: CalculatedRoute): Promise<{
    incidents: TrafficIncident[];
    congestion: number;
    needsReroute: boolean;
  }> => {
    try {
      // Sample points along the remaining route
      const currentProgress = vehicleProgressRef.current;
      const remainingCoords = route.coordinates.slice(
        Math.floor((currentProgress / 100) * route.coordinates.length)
      );

      if (remainingCoords.length < 2) {
        return { incidents: [], congestion: 0, needsReroute: false };
      }

      const samplePoints = remainingCoords.filter((_, i) => 
        i === 0 || i === remainingCoords.length - 1 || i % Math.ceil(remainingCoords.length / 8) === 0
      );

      const { data, error } = await supabase.functions.invoke('traffic-data', {
        body: { coordinates: samplePoints, routeKey: route.key }
      });

      if (error || !data) {
        return { incidents: [], congestion: 0, needsReroute: false };
      }

      // Check for severe incidents or high congestion ahead
      const hasBlockingIncident = data.incidents.some((inc: TrafficIncident) => 
        inc.severity >= 3 || inc.type?.toLowerCase().includes('accident')
      );
      const highCongestion = data.metrics.avgDensity > 70;

      return {
        incidents: data.incidents,
        congestion: data.metrics.avgDensity,
        needsReroute: hasBlockingIncident || (highCongestion && data.metrics.hasRoadClosure),
      };
    } catch (err) {
      console.error('Traffic check error:', err);
      return { incidents: [], congestion: 0, needsReroute: false };
    }
  }, []);

  // Dynamic rerouting from current vehicle position
  const triggerReroute = useCallback(async (reason: string) => {
    if (!state.vehiclePosition || !state.currentRoute) return;

    setState(prev => ({ ...prev, isRerouting: true }));
    
    console.log(`Dynamic reroute triggered: ${reason}`);
    toast.warning(`Rerouting: ${reason}`, { duration: 3000 });

    try {
      // Get incidents to avoid
      const incidentAreas = state.currentRoute.incidents.map(inc => inc.from);

      // Calculate new route from current vehicle position
      const newRoute = await calculateRoute(
        state.vehiclePosition,
        destination,
        'rerouted',
        incidentAreas
      );

      if (newRoute && newRoute.estimatedTime < (state.currentRoute.estimatedTime - state.currentRoute.trafficDelay)) {
        newRoute.color = ROUTE_COLORS[0];
        newRoute.name = 'Optimized Route';
        
        setState(prev => ({
          ...prev,
          currentRoute: newRoute,
          alternateRoutes: prev.currentRoute ? [{ ...prev.currentRoute, color: '#6b7280', isActive: false }] : [],
          vehicleProgress: 0,
          isRerouting: false,
          lastUpdate: new Date(),
        }));

        vehicleProgressRef.current = 0;
        toast.success(`New route: ${newRoute.estimatedTime} min (saved ${state.currentRoute.estimatedTime - newRoute.estimatedTime} min)`);
      } else {
        setState(prev => ({ ...prev, isRerouting: false }));
        toast.info('Current route remains optimal');
      }
    } catch (err) {
      console.error('Reroute failed:', err);
      setState(prev => ({ ...prev, isRerouting: false, error: 'Reroute failed' }));
    }
  }, [state.vehiclePosition, state.currentRoute, destination, calculateRoute]);

  // Initialize route
  const initializeRoute = useCallback(async () => {
    setState(prev => ({ ...prev, isRerouting: true }));

    const primaryRoute = await calculateRoute(origin, destination, 'primary');
    
    if (primaryRoute) {
      primaryRoute.color = ROUTE_COLORS[0];
      setState({
        currentRoute: primaryRoute,
        alternateRoutes: [],
        vehiclePosition: origin,
        vehicleProgress: 0,
        isRerouting: false,
        lastUpdate: new Date(),
        error: null,
      });
    } else {
      setState(prev => ({
        ...prev,
        isRerouting: false,
        error: 'Failed to calculate initial route',
      }));
    }
  }, [origin, destination, calculateRoute]);

  // Monitor traffic and trigger rerouting
  useEffect(() => {
    if (!state.currentRoute || !isMonitoringRef.current) return;

    const monitorTraffic = async () => {
      const { incidents, congestion, needsReroute } = await checkRouteTraffic(state.currentRoute!);
      
      // Update incidents on current route
      if (incidents.length > 0) {
        setState(prev => ({
          ...prev,
          currentRoute: prev.currentRoute ? {
            ...prev.currentRoute,
            incidents,
            congestion,
          } : null,
        }));
      }

      // Trigger automatic reroute if needed
      if (needsReroute && !state.isRerouting) {
        const reason = incidents.some(i => i.type?.toLowerCase().includes('accident'))
          ? 'Accident detected ahead'
          : 'High congestion detected';
        await triggerReroute(reason);
      }
    };

    // Check every 30 seconds
    const interval = setInterval(monitorTraffic, 30000);
    monitorTraffic(); // Initial check

    return () => clearInterval(interval);
  }, [state.currentRoute, state.isRerouting, checkRouteTraffic, triggerReroute]);

  // Update vehicle position based on progress
  const updateVehicleProgress = useCallback((progress: number) => {
    if (!state.currentRoute) return;

    vehicleProgressRef.current = progress;
    const coords = state.currentRoute.coordinates;
    const index = Math.min(
      Math.floor((progress / 100) * (coords.length - 1)),
      coords.length - 1
    );

    setState(prev => ({
      ...prev,
      vehicleProgress: progress,
      vehiclePosition: coords[index],
    }));
  }, [state.currentRoute]);

  // Manual refresh
  const refresh = useCallback(async () => {
    if (state.vehicleProgress < 5) {
      await initializeRoute();
    } else if (state.vehiclePosition) {
      await triggerReroute('Manual refresh');
    }
  }, [state.vehicleProgress, state.vehiclePosition, initializeRoute, triggerReroute]);

  // Initialize on mount
  useEffect(() => {
    initializeRoute();
    return () => {
      isMonitoringRef.current = false;
    };
  }, [initializeRoute]);

  return {
    ...state,
    updateVehicleProgress,
    triggerReroute,
    refresh,
    isLoading: state.isRerouting,
  };
}
