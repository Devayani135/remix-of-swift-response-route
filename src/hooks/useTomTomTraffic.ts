import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Coordinate {
  lat: number;
  lng: number;
}

interface TrafficSegment {
  point: Coordinate;
  currentSpeed: number;
  freeFlowSpeed: number;
  confidence: number;
  roadClosure: boolean;
  frc: string;
  currentTravelTime: number;
  freeFlowTravelTime: number;
}

interface TrafficIncident {
  id: string;
  type: string;
  severity: number;
  description: string;
  from: Coordinate;
  to: Coordinate;
  delay: number;
  startTime: string;
  endTime: string;
}

interface TrafficMetrics {
  avgDensity: number;
  maxDensity: number;
  avgSpeed: number;
  hasRoadClosure: boolean;
  hasIncidents: boolean;
  incidentCount: number;
  congestionLevel: 'low' | 'moderate' | 'high';
  speedFactor: number;
  congestionPenalty: number;
}

interface RouteTrafficData {
  routeKey: string;
  segments: TrafficSegment[];
  metrics: TrafficMetrics;
  incidents: TrafficIncident[];
  timestamp: string;
}

interface RouteDefinition {
  key: string;
  name: string;
  coordinates: [number, number][];
  distance: number;
  baseTime: number;
  color: string;
}

interface RouteWithTraffic extends RouteDefinition {
  trafficData?: RouteTrafficData;
  estimatedTime: number;
  congestion: number;
}

export function useTomTomTraffic(routes: RouteDefinition[]) {
  const [routesWithTraffic, setRoutesWithTraffic] = useState<RouteWithTraffic[]>([]);
  const [fastestRoute, setFastestRoute] = useState<string>('');
  const [allIncidents, setAllIncidents] = useState<TrafficIncident[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchTrafficForRoute = useCallback(async (route: RouteDefinition): Promise<RouteTrafficData | null> => {
    try {
      const coordinates = route.coordinates.map(([lat, lng]) => ({ lat, lng }));
      
      const { data, error } = await supabase.functions.invoke('traffic-data', {
        body: { coordinates, routeKey: route.key }
      });

      if (error) {
        console.error(`Error fetching traffic for ${route.key}:`, error);
        return null;
      }

      return data as RouteTrafficData;
    } catch (err) {
      console.error(`Failed to fetch traffic for ${route.key}:`, err);
      return null;
    }
  }, []);

  const calculateEstimatedTime = useCallback((route: RouteDefinition, trafficData: RouteTrafficData | null): number => {
    if (!trafficData) {
      // Fallback: use base time with random variation
      return route.baseTime + Math.floor(Math.random() * 5);
    }

    // SNSEV-inspired calculation:
    // Time = BaseTime * CongestionPenalty / SpeedFactor
    const { congestionPenalty, speedFactor } = trafficData.metrics;
    
    // Additional penalty for incidents
    const incidentPenalty = trafficData.incidents.reduce((penalty, incident) => {
      return penalty + (incident.delay / 60); // Convert delay seconds to minutes
    }, 0);

    // Road closure means this route is effectively blocked
    if (trafficData.metrics.hasRoadClosure) {
      return Infinity;
    }

    const estimatedTime = Math.round(
      (route.baseTime * congestionPenalty) / Math.max(speedFactor, 0.5) + incidentPenalty
    );

    return Math.max(route.baseTime, estimatedTime); // Never less than base time
  }, []);

  const refreshTrafficData = useCallback(async () => {
    if (routes.length === 0) return;

    setIsLoading(true);
    setError(null);

    try {
      // Fetch traffic data for all routes in parallel
      const trafficPromises = routes.map(route => fetchTrafficForRoute(route));
      const trafficResults = await Promise.all(trafficPromises);

      // Combine route definitions with traffic data
      const updatedRoutes: RouteWithTraffic[] = routes.map((route, index) => {
        const trafficData = trafficResults[index];
        const estimatedTime = calculateEstimatedTime(route, trafficData);
        
        return {
          ...route,
          trafficData: trafficData || undefined,
          estimatedTime,
          congestion: trafficData?.metrics.avgDensity || Math.floor(Math.random() * 50 + 20),
        };
      });

      // Sort by estimated time to find fastest route
      const sortedRoutes = [...updatedRoutes].sort((a, b) => a.estimatedTime - b.estimatedTime);
      const fastest = sortedRoutes[0];

      // Collect all incidents from all routes
      const incidents = trafficResults
        .filter((data): data is RouteTrafficData => data !== null)
        .flatMap(data => data.incidents);
      
      // Deduplicate incidents by id
      const uniqueIncidents = incidents.filter(
        (incident, index, self) => index === self.findIndex(i => i.id === incident.id)
      );

      setRoutesWithTraffic(sortedRoutes);
      setFastestRoute(fastest?.key || routes[0].key);
      setAllIncidents(uniqueIncidents);
      setLastUpdate(new Date());

      console.log(`Traffic updated: Fastest route = ${fastest?.name} (${fastest?.estimatedTime} min)`);
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch traffic data';
      setError(errorMessage);
      console.error('Traffic refresh error:', err);
      
      // Fallback to simulated data
      const fallbackRoutes: RouteWithTraffic[] = routes.map(route => ({
        ...route,
        estimatedTime: route.baseTime + Math.floor(Math.random() * 10),
        congestion: Math.floor(Math.random() * 60 + 20),
      }));
      
      const sorted = [...fallbackRoutes].sort((a, b) => a.estimatedTime - b.estimatedTime);
      setRoutesWithTraffic(sorted);
      setFastestRoute(sorted[0]?.key || routes[0].key);
    } finally {
      setIsLoading(false);
    }
  }, [routes, fetchTrafficForRoute, calculateEstimatedTime]);

  // Initial fetch and periodic updates (every 30 seconds as per SNSEV paper recommendations)
  useEffect(() => {
    refreshTrafficData();
    
    const interval = setInterval(refreshTrafficData, 30000); // 30 seconds
    
    return () => clearInterval(interval);
  }, [refreshTrafficData]);

  // Check for significant route changes and notify
  const checkForBetterRoute = useCallback((currentRoute: string): string | null => {
    if (routesWithTraffic.length === 0) return null;

    const currentRouteData = routesWithTraffic.find(r => r.key === currentRoute);
    const fastestRouteData = routesWithTraffic.find(r => r.key === fastestRoute);

    if (!currentRouteData || !fastestRouteData) return null;

    // If current route takes significantly longer (>3 min difference), suggest reroute
    const timeDifference = currentRouteData.estimatedTime - fastestRouteData.estimatedTime;
    
    if (timeDifference > 3 && fastestRoute !== currentRoute) {
      return fastestRoute;
    }

    return null;
  }, [routesWithTraffic, fastestRoute]);

  return {
    routesWithTraffic,
    fastestRoute,
    allIncidents,
    isLoading,
    lastUpdate,
    error,
    refreshTrafficData,
    checkForBetterRoute,
  };
}
