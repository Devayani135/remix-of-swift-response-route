import { useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface RoutePoint {
  lat: number;
  lng: number;
}

export interface MajorIncident {
  id: string;
  type: 'ACCIDENT' | 'ROAD_WORK' | 'VERY_HEAVY_TRAFFIC' | 'ROAD_CLOSURE';
  severity: number;
  description: string;
  location: RoutePoint;
  delay: number; // seconds
  detectedAt: Date;
}

export interface LiveRouteData {
  routeKey: string;
  coordinates: RoutePoint[]; // Full path from TomTom
  distance: number; // km
  estimatedTime: number; // minutes
  trafficDelay: number; // minutes
  algorithm: 'dijkstra' | 'astar';
}

export interface LiveNavigationState {
  currentRoute: LiveRouteData | null;
  vehiclePosition: RoutePoint | null;
  vehicleProgress: number; // 0-100
  vehicleIndex: number; // Current index in coordinates array
  majorIncidents: MajorIncident[];
  isRerouting: boolean;
  isNavigating: boolean;
  error: string | null;
}

// Filter incidents to only major ones (accident, road work, very heavy traffic)
export function filterMajorIncidents(incidents: any[]): MajorIncident[] {
  const majorTypes = ['ACCIDENT', 'ROAD_WORK', 'ROAD_CLOSURE', 'JAM'];
  
  return incidents
    .filter(inc => {
      const type = String(inc.type || '').toUpperCase();
      const severity = inc.severity || 0;
      
      // Include if: accident, road work, road closure, or severe jam (severity >= 3)
      return (
        type.includes('ACCIDENT') ||
        type.includes('ROAD_WORK') ||
        type.includes('CONSTRUCTION') ||
        type.includes('CLOSURE') ||
        (type.includes('JAM') && severity >= 3) ||
        severity >= 4 // Any very severe incident
      );
    })
    .map(inc => {
      let incidentType: MajorIncident['type'] = 'ACCIDENT';
      const type = String(inc.type || '').toUpperCase();
      
      if (type.includes('ROAD_WORK') || type.includes('CONSTRUCTION')) {
        incidentType = 'ROAD_WORK';
      } else if (type.includes('CLOSURE')) {
        incidentType = 'ROAD_CLOSURE';
      } else if (type.includes('JAM')) {
        incidentType = 'VERY_HEAVY_TRAFFIC';
      }
      
      return {
        id: inc.id || `incident-${Date.now()}-${Math.random()}`,
        type: incidentType,
        severity: inc.severity || 3,
        description: inc.description || `${incidentType.replace(/_/g, ' ')} reported`,
        location: inc.from || { lat: 0, lng: 0 },
        delay: inc.delay || 0,
        detectedAt: new Date(),
      };
    });
}

export function useLiveNavigation(
  origin: RoutePoint,
  destination: RoutePoint,
  onRouteChange?: (routeKey: string) => void
) {
  const [state, setState] = useState<LiveNavigationState>({
    currentRoute: null,
    vehiclePosition: origin,
    vehicleProgress: 0,
    vehicleIndex: 0,
    majorIncidents: [],
    isRerouting: false,
    isNavigating: false,
    error: null,
  });

  const animationRef = useRef<number | null>(null);
  const isMonitoringRef = useRef(true);
  const lastRerouteTimeRef = useRef(0);

  // Calculate route using TomTom API (returns full path coordinates)
  const calculateRoute = useCallback(async (
    from: RoutePoint,
    to: RoutePoint,
    routeKey: string,
    avoidAreas: RoutePoint[] = []
  ): Promise<LiveRouteData | null> => {
    try {
      const { data, error } = await supabase.functions.invoke('calculate-route', {
        body: { origin: from, destination: to, routeKey, avoidAreas }
      });

      if (error || !data) {
        console.error('Route calculation error:', error);
        return null;
      }

      return {
        routeKey: data.routeKey,
        coordinates: data.coordinates,
        distance: data.distance,
        estimatedTime: data.estimatedTime,
        trafficDelay: data.trafficDelay,
        algorithm: data.algorithm,
      };
    } catch (err) {
      console.error('Failed to calculate route:', err);
      return null;
    }
  }, []);

  // Check for major incidents on route ahead of vehicle
  const checkIncidentsAhead = useCallback(async (
    route: LiveRouteData,
    currentIndex: number
  ): Promise<{ incidents: MajorIncident[]; needsReroute: boolean }> => {
    try {
      // Get coordinates ahead of current position
      const remainingCoords = route.coordinates.slice(currentIndex);
      if (remainingCoords.length < 2) {
        return { incidents: [], needsReroute: false };
      }

      // Sample points for traffic check
      const samplePoints = remainingCoords.filter((_, i) => 
        i === 0 || i === remainingCoords.length - 1 || i % Math.ceil(remainingCoords.length / 5) === 0
      );

      const { data, error } = await supabase.functions.invoke('traffic-data', {
        body: { coordinates: samplePoints, routeKey: route.routeKey }
      });

      if (error || !data) {
        return { incidents: [], needsReroute: false };
      }

      // Filter to only major incidents
      const majorIncidents = filterMajorIncidents(data.incidents || []);
      
      // Check if any major incident requires rerouting
      const needsReroute = majorIncidents.some(inc => 
        inc.type === 'ACCIDENT' || 
        inc.type === 'ROAD_CLOSURE' ||
        (inc.type === 'VERY_HEAVY_TRAFFIC' && inc.severity >= 4)
      );

      return { incidents: majorIncidents, needsReroute };
    } catch (err) {
      console.error('Incident check error:', err);
      return { incidents: [], needsReroute: false };
    }
  }, []);

  // Dynamic reroute from current vehicle position
  const triggerReroute = useCallback(async (reason: string) => {
    const { currentRoute, vehiclePosition, vehicleIndex } = state;
    if (!currentRoute || !vehiclePosition) return;

    // Prevent rerouting too frequently (min 30 seconds between)
    const now = Date.now();
    if (now - lastRerouteTimeRef.current < 30000) {
      return;
    }
    lastRerouteTimeRef.current = now;

    setState(prev => ({ ...prev, isRerouting: true }));
    
    toast.warning(`⚠️ ${reason}`, { duration: 4000 });
    console.log(`Dynamic reroute triggered: ${reason}`);

    try {
      // Get incident locations to avoid
      const avoidAreas = state.majorIncidents.map(inc => inc.location);

      // Calculate new route from current vehicle position to destination
      const newRoute = await calculateRoute(
        vehiclePosition,
        destination,
        'rerouted',
        avoidAreas
      );

      if (newRoute) {
        toast.success(
          `New route: ${newRoute.estimatedTime} min via ${newRoute.algorithm === 'astar' ? 'A*' : 'Dijkstra'}`,
          { duration: 4000 }
        );

        setState(prev => ({
          ...prev,
          currentRoute: newRoute,
          vehicleProgress: 0,
          vehicleIndex: 0,
          isRerouting: false,
        }));

        onRouteChange?.('rerouted');
      } else {
        setState(prev => ({ ...prev, isRerouting: false }));
        toast.info('Could not find alternate route');
      }
    } catch (err) {
      console.error('Reroute failed:', err);
      setState(prev => ({ ...prev, isRerouting: false, error: 'Reroute failed' }));
    }
  }, [state, destination, calculateRoute, onRouteChange]);

  // Initialize route
  const initializeNavigation = useCallback(async () => {
    setState(prev => ({ ...prev, isRerouting: true }));

    const route = await calculateRoute(origin, destination, 'primary');
    
    if (route) {
      setState({
        currentRoute: route,
        vehiclePosition: origin,
        vehicleProgress: 0,
        vehicleIndex: 0,
        majorIncidents: [],
        isRerouting: false,
        isNavigating: true,
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

  // Start/stop navigation
  const startNavigation = useCallback(() => {
    setState(prev => ({ ...prev, isNavigating: true }));
  }, []);

  const stopNavigation = useCallback(() => {
    setState(prev => ({ ...prev, isNavigating: false }));
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
  }, []);

  // Animate vehicle along route coordinates
  useEffect(() => {
    if (!state.isNavigating || !state.currentRoute || state.isRerouting) return;

    const coords = state.currentRoute.coordinates;
    if (coords.length < 2) return;

    let lastCheckProgress = 0;
    let animationSpeed = 0.5; // Adjust for desired speed

    const animate = () => {
      setState(prev => {
        if (!prev.isNavigating || !prev.currentRoute) return prev;

        const newProgress = Math.min(prev.vehicleProgress + animationSpeed, 100);
        const newIndex = Math.min(
          Math.floor((newProgress / 100) * (coords.length - 1)),
          coords.length - 1
        );

        // Check for incidents every 10% progress
        if (Math.floor(newProgress / 10) > Math.floor(lastCheckProgress / 10)) {
          lastCheckProgress = newProgress;
          
          // Trigger async incident check (non-blocking)
          checkIncidentsAhead(prev.currentRoute!, newIndex).then(({ incidents, needsReroute }) => {
            if (incidents.length > 0) {
              setState(currentState => {
                if (needsReroute && !currentState.isRerouting) {
                  const incidentType = incidents[0].type.replace(/_/g, ' ').toLowerCase();
                  triggerReroute(`${incidentType} detected ahead`);
                }
                return { ...currentState, majorIncidents: incidents };
              });
            }
          });
        }

        return {
          ...prev,
          vehicleProgress: newProgress,
          vehicleIndex: newIndex,
          vehiclePosition: coords[newIndex],
        };
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [state.isNavigating, state.currentRoute, state.isRerouting, checkIncidentsAhead, triggerReroute]);

  // Monitor for incidents periodically
  useEffect(() => {
    if (!state.currentRoute || !isMonitoringRef.current || !state.isNavigating) return;

    const monitorInterval = setInterval(async () => {
      const { incidents, needsReroute } = await checkIncidentsAhead(
        state.currentRoute!,
        state.vehicleIndex
      );

      if (incidents.length > 0) {
        setState(prev => ({ ...prev, majorIncidents: incidents }));
        
        if (needsReroute && !state.isRerouting) {
          const reason = incidents.some(i => i.type === 'ACCIDENT')
            ? 'Accident detected ahead'
            : incidents.some(i => i.type === 'ROAD_CLOSURE')
            ? 'Road closure ahead'
            : 'Very heavy traffic detected';
          triggerReroute(reason);
        }
      }
    }, 30000); // Check every 30 seconds

    return () => clearInterval(monitorInterval);
  }, [state.currentRoute, state.vehicleIndex, state.isNavigating, state.isRerouting, checkIncidentsAhead, triggerReroute]);

  // Initialize on mount
  useEffect(() => {
    initializeNavigation();
    return () => {
      isMonitoringRef.current = false;
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [initializeNavigation]);

  return {
    ...state,
    startNavigation,
    stopNavigation,
    triggerReroute,
    refresh: initializeNavigation,
    isLoading: state.isRerouting,
  };
}
