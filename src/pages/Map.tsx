import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { 
  AlertTriangle, 
  Activity,
  Gauge,
  MapPin,
  Zap,
  Ambulance,
  Clock,
  Route
} from "lucide-react";
import { Header } from "@/components/layout/Header";
import { StatCard } from "@/components/dashboard/StatCard";
import { TrafficDensityBar } from "@/components/dashboard/TrafficDensityBar";
import { AlertCard } from "@/components/dashboard/AlertCard";
import { LeafletMap } from "@/components/map/LeafletMap";
import { RouteComparison } from "@/components/dashboard/RouteComparison";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useTrafficData } from "@/hooks/useTrafficData";
import { useTomTomTraffic, type TrafficIncident } from "@/hooks/useTomTomTraffic";
import { useToast } from "@/hooks/use-toast";
import type { DispatchData } from "@/components/forms/VehicleDispatchForm";

// Route definitions for TomTom traffic
const ROUTE_DEFINITIONS = [
  {
    key: "primary",
    name: "Via Mehdipatnam",
    color: "#22c55e",
    distance: 12.3,
    baseTime: 8,
    coordinates: [
      [17.4400, 78.3489],
      [17.4285, 78.3650],
      [17.4150, 78.3820],
      [17.3950, 78.4150],
      [17.3850, 78.4450],
      [17.3700, 78.4800],
      [17.3550, 78.5150],
      [17.3457, 78.5522],
    ] as [number, number][],
  },
  {
    key: "alternate1",
    name: "Via Kukatpally",
    color: "#3b82f6",
    distance: 18.5,
    baseTime: 14,
    coordinates: [
      [17.4400, 78.3489],
      [17.4600, 78.3700],
      [17.4850, 78.4100],
      [17.4950, 78.4500],
      [17.4800, 78.4900],
      [17.4400, 78.5100],
      [17.3900, 78.5300],
      [17.3457, 78.5522],
    ] as [number, number][],
  },
  {
    key: "alternate2",
    name: "Via Outer Ring Road",
    color: "#f59e0b",
    distance: 22.1,
    baseTime: 16,
    coordinates: [
      [17.4400, 78.3489],
      [17.4100, 78.3300],
      [17.3700, 78.3200],
      [17.3200, 78.3600],
      [17.3000, 78.4200],
      [17.3100, 78.4800],
      [17.3300, 78.5200],
      [17.3457, 78.5522],
    ] as [number, number][],
  },
];

export default function Map() {
  const location = useLocation();
  const { segments, averageDensity, worstSegment } = useTrafficData();
  const { toast } = useToast();
  
  const dispatchData = location.state?.dispatchData as DispatchData | undefined;
  
  const [selectedRoute, setSelectedRoute] = useState<string>("primary");
  const [accidentDetected, setAccidentDetected] = useState(false);

  // Use TomTom traffic hook
  const {
    routesWithTraffic,
    getIncidentsForRoute,
    isLoading,
  } = useTomTomTraffic(ROUTE_DEFINITIONS);

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
          description: "TomTom detected traffic incident. Consider alternate route.",
          variant: "destructive",
        });
      }
    }, 20000);

    return () => clearTimeout(timer);
  }, [toast, activeRouteIncidents.length]);

  // Show dispatch info on mount
  useEffect(() => {
    if (dispatchData) {
      toast({
        title: "Route Calculation Started",
        description: `Calculating optimal route for ${dispatchData.vehicleId}`,
      });
    }
  }, [dispatchData, toast]);

  return (
    <div className="min-h-screen bg-background">
      <Header activeAlerts={activeAlertCount} systemStatus="online" />
      
      <main className="p-6">
        <div className="max-w-[1800px] mx-auto space-y-6">
          {/* Page Title */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold tracking-tight">Live Route Monitoring</h2>
              <p className="text-muted-foreground">
                Real-time traffic analysis • {dispatchData ? `${dispatchData.source} ↔ ${dispatchData.destination}` : 'Gachibowli ↔ LB Nagar Corridor'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {dispatchData && (
                <Badge variant="outline" className="bg-emergency/10 border-emergency/20 text-emergency">
                  <Ambulance className="mr-1 h-3 w-3" />
                  {dispatchData.vehicleId} Active
                </Badge>
              )}
              <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary/10 border border-primary/20">
                <Zap className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">AI Routing Active</span>
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
              value={`${routesWithTraffic.find(r => r.key === selectedRoute)?.estimatedTime || 8}m`}
              subtitle="Based on live traffic"
              icon={Clock}
              variant="success"
            />
            <StatCard
              title="Route Algorithm"
              value={selectedRoute === 'primary' ? 'Dijkstra' : 'A*'}
              subtitle="Time-based cost function"
              icon={Route}
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
                    Live Route Visualization
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="h-[500px]">
                    <LeafletMap 
                      showAlternate={true} 
                      activeRoute={selectedRoute as "primary" | "alternate1" | "alternate2"}
                      accidentDetected={accidentDetected}
                      onRouteChange={setSelectedRoute}
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
                      Traffic Density Analysis
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

            {/* Right Column - Route Info & Alerts */}
            <div className="space-y-6">
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
                <CardContent className="space-y-3 max-h-[400px] overflow-y-auto">
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
