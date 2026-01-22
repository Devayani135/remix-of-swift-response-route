import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RouteRequest {
  origin: { lat: number; lng: number };
  destination: { lat: number; lng: number };
  routeKey?: string;
  avoidAreas?: { lat: number; lng: number }[]; // Areas to avoid (incidents)
}

interface RoutePoint {
  lat: number;
  lng: number;
}

interface RouteSummary {
  lengthInMeters: number;
  travelTimeInSeconds: number;
  trafficDelayInSeconds: number;
  departureTime: string;
  arrivalTime: string;
}

interface RouteResponse {
  routeKey: string;
  coordinates: RoutePoint[];
  summary: RouteSummary;
  distance: number; // km
  estimatedTime: number; // minutes
  trafficDelay: number; // minutes
  algorithm: 'dijkstra' | 'astar';
  timestamp: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const TOMTOM_API_KEY = Deno.env.get('TOMTOM_API_KEY');
    
    if (!TOMTOM_API_KEY) {
      console.error('TOMTOM_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'TomTom API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { origin, destination, routeKey = 'calculated', avoidAreas = [] } = await req.json() as RouteRequest;
    
    console.log(`Calculating route from (${origin.lat}, ${origin.lng}) to (${destination.lat}, ${destination.lng})`);

    // Build avoid parameter if there are areas to avoid
    let avoidParam = '';
    if (avoidAreas.length > 0) {
      // Create circular avoid areas around incident points (500m radius)
      const avoidCircles = avoidAreas.slice(0, 5).map(point => 
        `circle(${point.lat},${point.lng},500)`
      ).join(':');
      avoidParam = `&avoid=${avoidCircles}`;
    }

    // TomTom Routing API - Calculate Route
    // Using traffic=true for real-time traffic-based routing
    // routeType=shortest uses Dijkstra-like algorithm, routeType=fastest uses A*-like optimization
    const routeUrl = `https://api.tomtom.com/routing/1/calculateRoute/${origin.lat},${origin.lng}:${destination.lat},${destination.lng}/json?key=${TOMTOM_API_KEY}&traffic=true&travelMode=car&routeType=fastest&computeTravelTimeFor=all${avoidParam}`;
    
    console.log('Calling TomTom Routing API...');
    
    const response = await fetch(routeUrl);
    
    if (!response.ok) {
      console.error(`TomTom API error: ${response.status}`);
      throw new Error(`TomTom API returned ${response.status}`);
    }
    
    const data = await response.json();
    
    if (!data.routes || data.routes.length === 0) {
      throw new Error('No routes returned from TomTom API');
    }

    const route = data.routes[0];
    const summary = route.summary;
    
    // Extract route coordinates from legs
    const coordinates: RoutePoint[] = [];
    route.legs.forEach((leg: any) => {
      leg.points.forEach((point: any) => {
        coordinates.push({ lat: point.latitude, lng: point.longitude });
      });
    });

    // Simplify coordinates for performance (keep every Nth point)
    const simplifiedCoords = coordinates.filter((_, index) => 
      index === 0 || index === coordinates.length - 1 || index % 5 === 0
    );

    const routeResponse: RouteResponse = {
      routeKey,
      coordinates: simplifiedCoords,
      summary: {
        lengthInMeters: summary.lengthInMeters,
        travelTimeInSeconds: summary.travelTimeInSeconds,
        trafficDelayInSeconds: summary.trafficDelayInSeconds || 0,
        departureTime: summary.departureTime,
        arrivalTime: summary.arrivalTime,
      },
      distance: Math.round(summary.lengthInMeters / 100) / 10, // km with 1 decimal
      estimatedTime: Math.round(summary.travelTimeInSeconds / 60), // minutes
      trafficDelay: Math.round((summary.trafficDelayInSeconds || 0) / 60), // minutes
      algorithm: avoidAreas.length > 0 ? 'astar' : 'dijkstra', // A* when avoiding, Dijkstra for shortest
      timestamp: new Date().toISOString(),
    };

    console.log(`Route calculated: ${routeResponse.distance}km, ${routeResponse.estimatedTime}min (delay: ${routeResponse.trafficDelay}min)`);

    return new Response(
      JSON.stringify(routeResponse),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in calculate-route function:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to calculate route', details: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
