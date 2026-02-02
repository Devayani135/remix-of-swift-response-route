import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { VehicleDispatchForm, type DispatchData } from "@/components/forms/VehicleDispatchForm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Ambulance, Clock, Route, MapPin, Navigation2, Database, GitBranch, Cpu } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Dispatch() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isDispatching, setIsDispatching] = useState(false);

  const handleDispatch = (data: DispatchData) => {
    setIsDispatching(true);
    
    toast({
      title: "Vehicle Dispatched Successfully",
      description: `${data.vehicleId} is now en route from ${data.source} to ${data.destination}`,
    });

    // Navigate to map page with dispatch data
    setTimeout(() => {
      navigate("/map", { 
        state: { 
          dispatchData: data,
          source: data.source,
          destination: data.destination,
          sourceCoordinates: data.sourceCoordinates,
          destinationCoordinates: data.destinationCoordinates,
        } 
      });
    }, 500);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header activeAlerts={0} systemStatus="online" />
      
      <main className="p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Page Title */}
          <div className="text-center space-y-2">
            <h2 className="text-3xl font-bold tracking-tight">Emergency Vehicle Dispatch</h2>
            <p className="text-muted-foreground">
              Visakhapatnam (Vizag) • Real-time Route Optimization
            </p>
            <Badge variant="outline" className="bg-primary/10 border-primary/30">
              <Database className="mr-1 h-3 w-3" />
              OSM Dataset Loaded
            </Badge>
          </div>

          {/* Info Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="border-border/50 bg-gradient-to-br from-primary/5 to-primary/10">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 rounded-full bg-primary/10">
                  <Route className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium">Smart Routing</p>
                  <p className="text-xs text-muted-foreground">Dijkstra & A* Visible</p>
                </div>
              </CardContent>
            </Card>
            
            <Card className="border-border/50 bg-gradient-to-br from-success/5 to-success/10">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 rounded-full bg-success/10">
                  <Clock className="h-5 w-5 text-success" />
                </div>
                <div>
                  <p className="text-sm font-medium">Real-time Traffic</p>
                  <p className="text-xs text-muted-foreground">TomTom API</p>
                </div>
              </CardContent>
            </Card>
            
            <Card className="border-border/50 bg-gradient-to-br from-warning/5 to-warning/10">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 rounded-full bg-warning/10">
                  <Navigation2 className="h-5 w-5 text-warning" />
                </div>
                <div>
                  <p className="text-sm font-medium">Turn-by-Turn</p>
                  <p className="text-xs text-muted-foreground">Live Navigation</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/50 bg-gradient-to-br from-info/5 to-info/10">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 rounded-full bg-info/10">
                  <Cpu className="h-5 w-5 text-info" />
                </div>
                <div>
                  <p className="text-sm font-medium">Graph Processing</p>
                  <p className="text-xs text-muted-foreground">90 Nodes</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Algorithm Info */}
          <Card className="border-border/50 bg-gradient-to-r from-primary/5 via-background to-primary/5">
            <CardContent className="p-4">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-3">
                  <GitBranch className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-sm font-medium">Algorithm Selection</p>
                    <p className="text-xs text-muted-foreground">
                      <span className="text-success">Dijkstra</span> for initial route • <span className="text-warning">A*</span> for rerouting with incidents
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Badge variant="outline" className="bg-success/10 border-success/30 text-success">
                    Dijkstra: O((V+E) log V)
                  </Badge>
                  <Badge variant="outline" className="bg-warning/10 border-warning/30 text-warning">
                    A*: Heuristic Guided
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Dispatch Form */}
          <div className="max-w-lg mx-auto">
            <VehicleDispatchForm onDispatch={handleDispatch} />
          </div>

          {/* Route Preview */}
          <Card className="border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <MapPin className="h-5 w-5 text-info" />
                Vizag Road Network
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between p-4 rounded-lg bg-secondary/20 border border-border/50">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-success/10">
                    <MapPin className="h-4 w-4 text-success" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Apollo Heart Hospital</p>
                    <p className="text-xs text-muted-foreground">Default Start Point</p>
                  </div>
                </div>
                
                <div className="flex-1 mx-4 border-t-2 border-dashed border-primary/30" />
                
                <div className="flex items-center gap-3">
                  <div>
                    <p className="text-sm font-medium text-right">VIMS Hospital</p>
                    <p className="text-xs text-muted-foreground text-right">Default Destination</p>
                  </div>
                  <div className="p-2 rounded-full bg-emergency/10">
                    <MapPin className="h-4 w-4 text-emergency" />
                  </div>
                </div>
              </div>
              <p className="text-xs text-muted-foreground text-center mt-3">
                90 locations from OSM data • Graph-based routing with live traffic integration
              </p>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
