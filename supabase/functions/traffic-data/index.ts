import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TrafficFlowRequest {
  coordinates: { lat: number; lng: number }[];
  routeKey?: string;
}

interface TrafficFlowSegment {
  point: { lat: number; lng: number };
  currentSpeed: number;
  freeFlowSpeed: number;
  confidence: number;
  roadClosure: boolean;
  frc: string; // Functional Road Class
  currentTravelTime: number;
  freeFlowTravelTime: number;
}

interface TrafficIncident {
  id: string;
  type: string;
  severity: number;
  description: string;
  from: { lat: number; lng: number };
  to: { lat: number; lng: number };
  delay: number;
  startTime: string;
  endTime: string;
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

    const { coordinates, routeKey } = await req.json() as TrafficFlowRequest;
    
    console.log(`Fetching traffic data for ${coordinates.length} points, route: ${routeKey}`);

    // Fetch traffic flow data for each coordinate point
    const trafficFlowPromises = coordinates.map(async (coord, index) => {
      // TomTom Traffic Flow API endpoint
      // Using Traffic Flow Segment Data API for detailed road information
      const url = `https://api.tomtom.com/traffic/services/4/flowSegmentData/relative0/10/json?point=${coord.lat},${coord.lng}&key=${TOMTOM_API_KEY}&unit=KMPH`;
      
      try {
        const response = await fetch(url);
        
        if (!response.ok) {
          console.error(`Traffic API error for point ${index}: ${response.status}`);
          // Return simulated data on API error
          return {
            point: coord,
            currentSpeed: 40 + Math.random() * 30, // 40-70 km/h
            freeFlowSpeed: 60 + Math.random() * 20, // 60-80 km/h
            confidence: 0.7,
            roadClosure: false,
            frc: "FRC3",
            currentTravelTime: 0,
            freeFlowTravelTime: 0,
          };
        }
        
        const data = await response.json();
        const flowData = data.flowSegmentData;
        
        return {
          point: coord,
          currentSpeed: flowData?.currentSpeed || 40,
          freeFlowSpeed: flowData?.freeFlowSpeed || 60,
          confidence: flowData?.confidence || 0.7,
          roadClosure: flowData?.roadClosure || false,
          frc: flowData?.frc || "FRC3",
          currentTravelTime: flowData?.currentTravelTime || 0,
          freeFlowTravelTime: flowData?.freeFlowTravelTime || 0,
        };
      } catch (error) {
        console.error(`Error fetching traffic for point ${index}:`, error);
        return {
          point: coord,
          currentSpeed: 40 + Math.random() * 30,
          freeFlowSpeed: 60 + Math.random() * 20,
          confidence: 0.5,
          roadClosure: false,
          frc: "FRC3",
          currentTravelTime: 0,
          freeFlowTravelTime: 0,
        };
      }
    });

    const trafficFlowResults = await Promise.all(trafficFlowPromises);

    // Calculate route-level metrics based on SNSEV paper approach
    // Traffic density = (freeFlowSpeed - currentSpeed) / freeFlowSpeed * 100
    const densities = trafficFlowResults.map(segment => {
      const congestionRatio = (segment.freeFlowSpeed - segment.currentSpeed) / segment.freeFlowSpeed;
      return Math.max(0, Math.min(100, congestionRatio * 100));
    });

    const avgDensity = densities.reduce((sum, d) => sum + d, 0) / densities.length;
    const maxDensity = Math.max(...densities);
    const avgSpeed = trafficFlowResults.reduce((sum, s) => sum + s.currentSpeed, 0) / trafficFlowResults.length;
    const hasRoadClosure = trafficFlowResults.some(s => s.roadClosure);

    // Fetch traffic incidents for the route area
    // Calculate bounding box from coordinates
    const lats = coordinates.map(c => c.lat);
    const lngs = coordinates.map(c => c.lng);
    const minLat = Math.min(...lats) - 0.01;
    const maxLat = Math.max(...lats) + 0.01;
    const minLng = Math.min(...lngs) - 0.01;
    const maxLng = Math.max(...lngs) + 0.01;

    let incidents: TrafficIncident[] = [];
    
    try {
      // TomTom Traffic Incidents API
      const incidentUrl = `https://api.tomtom.com/traffic/services/5/incidentDetails?key=${TOMTOM_API_KEY}&bbox=${minLng},${minLat},${maxLng},${maxLat}&fields={incidents{type,geometry{type,coordinates},properties{iconCategory,magnitudeOfDelay,events{description,code,iconCategory},startTime,endTime,from,to,length,delay,roadNumbers,timeValidity,probabilityOfOccurrence,numberOfReports,lastReportTime}}}`;
      
      const incidentResponse = await fetch(incidentUrl);
      
      if (incidentResponse.ok) {
        const incidentData = await incidentResponse.json();
        
        if (incidentData.incidents) {
          incidents = incidentData.incidents.map((inc: any, idx: number) => ({
            id: `incident-${idx}`,
            type: inc.properties?.iconCategory || 'unknown',
            severity: inc.properties?.magnitudeOfDelay || 0,
            description: inc.properties?.events?.[0]?.description || 'Traffic incident',
            from: {
              lat: inc.geometry?.coordinates?.[0]?.[1] || minLat,
              lng: inc.geometry?.coordinates?.[0]?.[0] || minLng,
            },
            to: {
              lat: inc.geometry?.coordinates?.[1]?.[1] || maxLat,
              lng: inc.geometry?.coordinates?.[1]?.[0] || maxLng,
            },
            delay: inc.properties?.delay || 0,
            startTime: inc.properties?.startTime || '',
            endTime: inc.properties?.endTime || '',
          }));
        }
      }
    } catch (error) {
      console.error('Error fetching incidents:', error);
    }

    // Calculate estimated travel time based on SNSEV algorithm
    // Time = Distance / AverageSpeed, with congestion penalty
    // Using a simplified version of the paper's approach
    const baseSpeedFactor = avgSpeed / 60; // Normalize to expected 60 km/h average
    const congestionPenalty = 1 + (avgDensity / 100) * 0.8; // 0-80% time increase based on density
    
    const response = {
      routeKey,
      segments: trafficFlowResults,
      metrics: {
        avgDensity: Math.round(avgDensity),
        maxDensity: Math.round(maxDensity),
        avgSpeed: Math.round(avgSpeed),
        hasRoadClosure,
        hasIncidents: incidents.length > 0,
        incidentCount: incidents.length,
        congestionLevel: avgDensity < 30 ? 'low' : avgDensity < 60 ? 'moderate' : 'high',
        speedFactor: baseSpeedFactor,
        congestionPenalty,
      },
      incidents,
      timestamp: new Date().toISOString(),
    };

    console.log(`Traffic data response for ${routeKey}: avgDensity=${response.metrics.avgDensity}%, avgSpeed=${response.metrics.avgSpeed}km/h`);

    return new Response(
      JSON.stringify(response),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in traffic-data function:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to fetch traffic data', details: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
