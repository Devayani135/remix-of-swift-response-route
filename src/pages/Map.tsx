import { useState, useEffect, useMemo } from "react";
import { useLocation } from "react-router-dom";
import { 
  AlertTriangle, 
  Activity,
  Gauge,
  MapPin,
  Zap,
  Ambulance,
  Clock,
  Route,
  GitBranch,
  Cpu
} from "lucide-react";
import { Header } from "@/components/layout/Header";
import { StatCard } from "@/components/dashboard/StatCard";
import { TrafficDensityBar } from "@/components/dashboard/TrafficDensityBar";
import { LeafletMap } from "@/components/map/LeafletMap";
import { RouteComparison } from "@/components/dashboard/RouteComparison";
import { TurnByTurnPanel } from "@/components/navigation/TurnByTurnPanel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useTrafficData } from "@/hooks/useTrafficData";
import { useTomTomTraffic, type TrafficIncident } from "@/hooks/useTomTomTraffic";
import { useToast } from "@/hooks/use-toast";
import { findOptimalRoute, getVizagGraph, type DijkstraResult, type AStarResult } from "@/utils/graphAlgorithms";
import { VIZAG_CENTER, DEFAULT_SOURCE_VIZAG, DEFAULT_DESTINATION_VIZAG } from "@/utils/vizagLocations";
import type { DispatchData } from "@/components/forms/VehicleDispatchForm";

// Vizag route definitions for TomTom traffic
const ROUTE_DEFINITIONS = [
  {
    key: "primary",
    name: "Via Beach Road",
    color: "#22c55e",
    distance: 8.5,
    baseTime: 15,
    coordinates: [
      [17.717130, 83.309240], // Apollo Heart Hospital
      [17.711897, 83.302416], // Jagadamba Center
      [17.710594, 83.316826], // RK Beach
      [17.721811, 83.335590], // VUDA Park
      [17.731683, 83.334045], // Pedda Waltair
      [17.759150, 83.330054], // VIMS
    ] as [number, number][],
  },
  {
    key: "alternate1",
    name: "Via MVP Colony",
    color: "#3b82f6",
    distance: 10.2,
    baseTime: 18,
    coordinates: [
      [17.717130, 83.309240], // Apollo Heart Hospital
      [17.724754, 83.306172], // Asilmetta Junction
      [17.737773, 83.304691], // 4th Town Junction
      [17.747849, 83.331857], // Medicover MVP
      [17.759150, 83.330054], // VIMS
    ] as [number, number][],
  },
  {
    key: "alternate2",
    name: "Via Seethamadara",
    color: "#f59e0b",
    distance: 9.5,
    baseTime: 17,
    coordinates: [
      [17.717130, 83.309240], // Apollo Heart Hospital
      [17.726716, 83.298984], // Kalavathi Surgical Hospital
      [17.736772, 83.307738], // Gurudwara Junction
      [17.743332, 83.314369], // Seethamadara
      [17.761193, 83.317673], // Apollo Arilova
      [17.759150, 83.330054], // VIMS
    ] as [number, number][],
  },
];

export default function Map() {
  const location = useLocation();
  const { segments, averageDensity, worstSegment } = useTrafficData();
  const { toast } = useToast();
  
  const dispatchData = location.state?.dispatchData as DispatchData | undefined;
  const sourceCoords = location.state?.sourceCoordinates || { lat: DEFAULT_SOURCE_VIZAG.lat, lng: DEFAULT_SOURCE_VIZAG.lng };
  const destCoords = location.state?.destinationCoordinates || { lat: DEFAULT_DESTINATION_VIZAG.lat, lng: DEFAULT_DESTINATION_VIZAG.lng };
  const sourceName = dispatchData?.source || DEFAULT_SOURCE_VIZAG.name;
  const destName = dispatchData?.destination || DEFAULT_DESTINATION_VIZAG.name;
  
  const [selectedRoute, setSelectedRoute] = useState<string>("primary");
  const [accidentDetected, setAccidentDetected] = useState(false);
  const [calculatedRoute, setCalculatedRoute] = useState<DijkstraResult | AStarResult | null>(null);
  const [currentNodeIndex, setCurrentNodeIndex] = useState(0);
  const [isCalculating, setIsCalculating] = useState(false);

  // Use TomTom traffic hook
  const {
    routesWithTraffic,
    getIncidentsForRoute,
    isLoading,
  } = useTomTomTraffic(ROUTE_DEFINITIONS);

  // Calculate route using graph algorithms
  useEffect(() => {
    const calculateGraphRoute = async () => {
      setIsCalculating(true);
      
      console.log('=== ROUTE CALCULATION REQUEST ===');
      console.log(`Source: ${sourceName}`);
      console.log(`Destination: ${destName}`);
      
      // Initialize the graph
      const graph = getVizagGraph();
      console.log(`Graph loaded: ${graph.nodes.size} nodes`);
      
      // Find optimal route using Dijkstra (no incidents) or A* (with incidents)
      const result = findOptimalRoute(sourceName, destName, []);
      
      if (result) {
        setCalculatedRoute(result);
        toast({
          title: `Route Calculated (${result.algorithm.toUpperCase()})`,
          description: `${result.totalDistance.toFixed(1)} km, ${Math.round(result.totalTime)} min, ${result.nodesVisited} nodes visited`,
        });
      } else {
        console.log('No route found, using TomTom fallback');
        toast({
          title: "Using TomTom Route",
          description: "Graph route not available, using TomTom API",
        });
      }
      
      setIsCalculating(false);
    };
    
    calculateGraphRoute();
  }, [sourceName, destName, toast]);

  // Simulate vehicle progress
  useEffect(() => {
    if (!calculatedRoute || calculatedRoute.pathNodes.length < 2) return;
    
    const interval = setInterval(() => {
      setCurrentNodeIndex(prev => {
        if (prev >= calculatedRoute.pathNodes.length - 1) {
          return 0; // Loop back
        }
        return prev + 1;
      });
    }, 3000); // Move every 3 seconds
    
    return () => clearInterval(interval);
  }, [calculatedRoute]);

  // Get incidents for active route - these come from TomTom API
  const activeRouteIncidents = getIncidentsForRoute(selectedRoute);

  // Count high severity incidents as alerts
  const activeAlertCount = activeRouteIncidents.filter(
    (inc) => inc.severity >= 3
  ).length;

  // Simulate accident detection after 20 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      if (activeRouteIncidents.length > 0) {
        setAccidentDetected(true);
        toast({
          title: "⚠️ Incident Detected on Route!",
          description: "TomTom detected traffic incident. Triggering A* reroute...",
          variant: "destructive",
        });
        
        // Recalculate with A* avoiding incident
        if (activeRouteIncidents[0]?.from) {
          const result = findOptimalRoute(
            sourceName, 
            destName, 
            [{ lat: activeRouteIncidents[0].from.lat, lng: activeRouteIncidents[0].from.lng }]
          );
          if (result) {
            setCalculatedRoute(result);
            toast({
              title: `Rerouted using ${result.algorithm.toUpperCase()}`,
              description: `New route: ${result.totalDistance.toFixed(1)} km, ${Math.round(result.totalTime)} min`,
            });
          }
        }
      }
    }, 20000);

    return () => clearTimeout(timer);
  }, [toast, activeRouteIncidents, sourceName, destName]);

  // Show dispatch info on mount
  useEffect(() => {
    if (dispatchData) {
      toast({
        title: "Route Calculation Started",
        description: `Calculating optimal route for ${dispatchData.vehicleId} using Dijkstra/A*`,
      });
    }
  }, [dispatchData, toast]);

  return (
    <div className="min-h-screen bg-background">
      <Header activeAlerts={activeAlertCount} systemStatus="online" />
      
      <main className="p-6">
        <div className="max-w-[1800px] mx-auto space-y-6">
          {/* Page Title */}
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h2 className="text-2xl font-bold tracking-tight">Live Route Monitoring</h2>
              <p className="text-muted-foreground">
                Visakhapatnam • {sourceName} ↔ {destName}
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {dispatchData && (
                <Badge variant="outline" className="bg-emergency/10 border-emergency/20 text-emergency">
                  <Ambulance className="mr-1 h-3 w-3" />
                  {dispatchData.vehicleId} Active
                </Badge>
              )}
              <Badge variant="outline" className="bg-primary/10 border-primary/30">
                <Cpu className="mr-1 h-3 w-3" />
                Graph: {getVizagGraph().nodes.size} nodes
              </Badge>
              {calculatedRoute && (
                <Badge variant="outline" className={`${calculatedRoute.algorithm === 'astar' ? 'bg-warning/10 border-warning/30 text-warning' : 'bg-success/10 border-success/30 text-success'}`}>
                  <GitBranch className="mr-1 h-3 w-3" />
                  {calculatedRoute.algorithm.toUpperCase()} | {calculatedRoute.nodesVisited} nodes visited
                </Badge>
              )}
              <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary/10 border border-primary/20">
                <Zap className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">SNSEV Routing Active</span>
              </div>
            </div>
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard
              title="Active Vehicle"
              value={dispatchData?.vehicleId || "None"}
              subtitle={dispatchData?.vehicleType || "No vehicle dispatched"}
              icon={Ambulance}
              variant="emergency"
            />
            <StatCard
              title="Est. Response Time"
              value={`${calculatedRoute?.totalTime ? Math.round(calculatedRoute.totalTime) : routesWithTraffic.find(r => r.key === selectedRoute)?.estimatedTime || 15}m`}
              subtitle="Based on graph calculation"
              icon={Clock}
              variant="success"
            />
            <StatCard
              title="Route Algorithm"
              value={calculatedRoute?.algorithm === 'astar' ? 'A*' : 'Dijkstra'}
              subtitle={`${calculatedRoute?.executionTimeMs?.toFixed(2) || 0}ms execution`}
              icon={GitBranch}
              variant="info"
            />
            <StatCard
              title="Route Incidents"
              value={activeRouteIncidents.length}
              subtitle={activeRouteIncidents.length > 0 ? "TomTom detected" : "Clear route"}
              icon={AlertTriangle}
              variant={activeRouteIncidents.length > 0 ? "emergency" : "success"}
            />
          </div>

          {/* Main Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Map & Traffic */}
            <div className="lg:col-span-2 space-y-6">
              {/* Interactive Map */}
              <Card className="border-border/50 overflow-hidden">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-primary" />
                    Live Route Visualization (Vizag OSM)
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="h-[500px]">
                    <LeafletMap 
                      showAlternate={true} 
                      activeRoute={selectedRoute as "primary" | "alternate1" | "alternate2"}
                      accidentDetected={accidentDetected}
                      onRouteChange={setSelectedRoute}
                      sourceCoords={sourceCoords}
                      destCoords={destCoords}
                      sourceName={sourceName}
                      destName={destName}
                      calculatedRoute={calculatedRoute}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Traffic Density Section */}
              <Card className="border-border/50">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <Gauge className="h-5 w-5 text-warning" />
                      Traffic Density Analysis (Vizag)
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      <Activity className="h-4 w-4 text-muted-foreground animate-pulse" />
                      <span className="text-xs text-muted-foreground">Updating live</span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {segments.map((segment) => (
                    <TrafficDensityBar
                      key={segment.id}
                      label={segment.name}
                      location={segment.location}
                      density={Math.round(segment.density)}
                    />
                  ))}
                  
                  <div className="pt-2 border-t border-border flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Overall Corridor Status</span>
                    <span className="font-mono font-bold">
                      {averageDensity}% Avg Density
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right Column - Navigation & Alerts */}
            <div className="space-y-6">
              {/* Turn-by-Turn Navigation Panel */}
              <TurnByTurnPanel
                pathNodes={calculatedRoute?.pathNodes || []}
                currentNodeIndex={currentNodeIndex}
                totalDistance={calculatedRoute?.totalDistance || 0}
                totalTime={calculatedRoute?.totalTime || 0}
                algorithm={calculatedRoute?.algorithm || 'dijkstra'}
              />

              {/* Route Comparison */}
              <RouteComparison
                routes={routesWithTraffic.map(route => ({
                  id: route.key,
                  name: route.name,
                  distance: route.distance,
                  estimatedTime: route.estimatedTime,
                  trafficLevel: route.congestion >= 60 ? "heavy" : route.congestion >= 30 ? "moderate" : "clear",
                  congestionPoints: Math.ceil(route.congestion / 20),
                  isRecommended: routesWithTraffic[0]?.key === route.key,
                  algorithm: route.key === 'primary' ? 'Dijkstra' : 'A*',
                }))}
                selectedRoute={selectedRoute}
                onSelectRoute={setSelectedRoute}
              />

              {/* TomTom Incident Alerts */}
              <Card className="border-border/50">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-emergency" />
                    Route Incidents (TomTom)
                    {activeRouteIncidents.length > 0 && (
                      <span className="ml-2 flex h-5 w-5 items-center justify-center rounded-full bg-emergency text-[10px] font-bold text-emergency-foreground">
                        {activeRouteIncidents.length}
                      </span>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 max-h-[300px] overflow-y-auto">
                  {activeRouteIncidents.length === 0 ? (
                    <div className="text-center py-8">
                      <div className="p-3 rounded-full bg-success/10 w-fit mx-auto mb-3">
                        <Route className="h-6 w-6 text-success" />
                      </div>
                      <p className="text-sm font-medium text-success">Route is Clear</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        No incidents detected on active route
                      </p>
                    </div>
                  ) : (
                    activeRouteIncidents.map((incident, index) => (
                      <IncidentCard key={incident.id || index} incident={incident} />
                    ))
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

// Incident Card component for TomTom incidents
function IncidentCard({ incident }: { incident: TrafficIncident }) {
  const incidentType = typeof incident.type === 'string' 
    ? incident.type 
    : String(incident.type || 'Incident');
  
  const severityColors = {
    low: "bg-warning/10 border-warning/30 text-warning",
    medium: "bg-orange-500/10 border-orange-500/30 text-orange-500",
    high: "bg-emergency/10 border-emergency/30 text-emergency",
  };
  
  const severity = incident.severity >= 4 ? "high" : incident.severity >= 2 ? "medium" : "low";
  
  return (
    <Card className={`border ${severityColors[severity]} p-3`}>
      <div className="flex items-start gap-3">
        <div className="p-1.5 rounded-full bg-current/10">
          <AlertTriangle className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">{incidentType}</p>
          {incident.description && (
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
              {incident.description}
            </p>
          )}
          <div className="flex items-center gap-2 mt-2">
            {incident.delay > 0 && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                +{Math.round(incident.delay / 60)} min delay
              </Badge>
            )}
            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
              Severity: {incident.severity}/5
            </Badge>
          </div>
        </div>
      </div>
    </Card>
  );
}
