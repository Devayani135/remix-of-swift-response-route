import { useState, useEffect } from "react";
import { 
  Ambulance, 
  Clock, 
  Route, 
  AlertTriangle, 
  Activity,
  Gauge,
  MapPin,
  Zap
} from "lucide-react";
import { Header } from "@/components/layout/Header";
import { StatCard } from "@/components/dashboard/StatCard";
import { TrafficDensityBar } from "@/components/dashboard/TrafficDensityBar";
import { AlertCard } from "@/components/dashboard/AlertCard";
import { LeafletMap } from "@/components/map/LeafletMap";
import { VehicleDispatchForm, type DispatchData } from "@/components/forms/VehicleDispatchForm";
import { CCTVFeedGrid } from "@/components/dashboard/CCTVFeedGrid";
import { RouteComparison } from "@/components/dashboard/RouteComparison";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAlerts } from "@/hooks/useAlerts";
import { useTrafficData } from "@/hooks/useTrafficData";
import { useToast } from "@/hooks/use-toast";

export default function Index() {
  const { alerts, dismissAlert, activeCount } = useAlerts();
  const { segments, averageDensity, worstSegment } = useTrafficData();
  const { toast } = useToast();
  
  const [selectedRoute, setSelectedRoute] = useState<string>("primary");
  const [activeVehicles, setActiveVehicles] = useState(3);
  const [dispatchedVehicle, setDispatchedVehicle] = useState<DispatchData | null>(null);
  const [accidentDetected, setAccidentDetected] = useState(false);

  // Simulate accident detection after 15 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      setAccidentDetected(true);
      toast({
        title: "⚠️ Accident Detected!",
        description: "YOLOv8 detected collision at Mehdipatnam. Switching to alternate route.",
        variant: "destructive",
      });
      // Auto-switch to alternate route
      setSelectedRoute("alternate1");
    }, 15000);

    return () => clearTimeout(timer);
  }, [toast]);

  const handleDispatch = (data: DispatchData) => {
    setDispatchedVehicle(data);
    setActiveVehicles(prev => prev + 1);
    
    toast({
      title: "Vehicle Dispatched Successfully",
      description: `${data.vehicleId} is now en route from ${data.source} to ${data.destination}`,
    });
  };

  const handleViewRoute = (alertId: string) => {
    const alert = alerts.find(a => a.id === alertId);
    if (alert) {
      toast({
        title: "Alternate Route Loaded",
        description: alert.alternateRoute,
      });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header activeAlerts={activeCount} systemStatus="online" />
      
      <main className="p-6">
        <div className="max-w-[1800px] mx-auto space-y-6">
          {/* Page Title */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold tracking-tight">Emergency Route Command Center</h2>
              <p className="text-muted-foreground">
                Real-time traffic monitoring • Gachibowli ↔ LB Nagar Corridor
              </p>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary/10 border border-primary/20">
              <Zap className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">AI Routing Active</span>
            </div>
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard
              title="Active Vehicles"
              value={activeVehicles}
              subtitle="Emergency units deployed"
              icon={Ambulance}
              variant="emergency"
            />
            <StatCard
              title="Avg Response Time"
              value="8.4m"
              subtitle="↓ 23% from last week"
              icon={Clock}
              trend={{ value: 23, isPositive: true }}
              variant="success"
            />
            <StatCard
              title="Routes Optimized"
              value="156"
              subtitle="Today's calculations"
              icon={Route}
              variant="info"
            />
            <StatCard
              title="Active Alerts"
              value={activeCount}
              subtitle={worstSegment.name}
              icon={AlertTriangle}
              variant={activeCount > 2 ? "emergency" : "warning"}
            />
          </div>

          {/* Main Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Map & Route Info */}
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
                  <div className="h-[450px]">
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

              {/* CCTV Feeds */}
              <CCTVFeedGrid />
            </div>

            {/* Right Column - Controls & Alerts */}
            <div className="space-y-6">
              {/* Vehicle Dispatch Form */}
              <VehicleDispatchForm onDispatch={handleDispatch} />

              {/* Route Comparison */}
              <RouteComparison
                routes={[
                  {
                    id: "primary",
                    name: "Via Mehdipatnam (Primary)",
                    distance: 12.3,
                    estimatedTime: 8,
                    trafficLevel: accidentDetected ? "heavy" : "moderate",
                    congestionPoints: accidentDetected ? 5 : 2,
                    isRecommended: !accidentDetected,
                    algorithm: "A*",
                  },
                  {
                    id: "alternate1",
                    name: "Via Kukatpally (Alternate)",
                    distance: 18.5,
                    estimatedTime: 14,
                    trafficLevel: "moderate",
                    congestionPoints: 3,
                    isRecommended: accidentDetected,
                    algorithm: "Dijkstra",
                  },
                  {
                    id: "alternate2",
                    name: "Via Outer Ring Road",
                    distance: 22.1,
                    estimatedTime: 16,
                    trafficLevel: "clear",
                    congestionPoints: 1,
                    algorithm: "Dijkstra",
                  },
                ]}
                selectedRoute={selectedRoute}
                onSelectRoute={setSelectedRoute}
              />

              {/* Alerts Section */}
              <Card className="border-border/50">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-emergency" />
                    Active Alerts
                    {activeCount > 0 && (
                      <span className="ml-2 flex h-5 w-5 items-center justify-center rounded-full bg-emergency text-[10px] font-bold text-emergency-foreground">
                        {activeCount}
                      </span>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 max-h-[400px] overflow-y-auto">
                  {alerts.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      No active alerts
                    </p>
                  ) : (
                    alerts.map((alert) => (
                      <AlertCard
                        key={alert.id}
                        alert={alert}
                        onDismiss={dismissAlert}
                        onViewRoute={handleViewRoute}
                      />
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
