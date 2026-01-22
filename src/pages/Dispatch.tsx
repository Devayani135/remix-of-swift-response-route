import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { VehicleDispatchForm, type DispatchData } from "@/components/forms/VehicleDispatchForm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Ambulance, Clock, Route, MapPin, Navigation2 } from "lucide-react";
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
          destination: data.destination
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
              Register emergency vehicle and calculate optimal route
            </p>
          </div>

          {/* Info Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="border-border/50 bg-gradient-to-br from-primary/5 to-primary/10">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 rounded-full bg-primary/10">
                  <Route className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium">Smart Routing</p>
                  <p className="text-xs text-muted-foreground">Dijkstra & A* Algorithms</p>
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
                  <p className="text-xs text-muted-foreground">TomTom API Integration</p>
                </div>
              </CardContent>
            </Card>
            
            <Card className="border-border/50 bg-gradient-to-br from-warning/5 to-warning/10">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 rounded-full bg-warning/10">
                  <Navigation2 className="h-5 w-5 text-warning" />
                </div>
                <div>
                  <p className="text-sm font-medium">Dynamic Rerouting</p>
                  <p className="text-xs text-muted-foreground">Incident Detection</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Dispatch Form */}
          <div className="max-w-lg mx-auto">
            <VehicleDispatchForm onDispatch={handleDispatch} />
          </div>

          {/* Route Preview */}
          <Card className="border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <MapPin className="h-5 w-5 text-info" />
                Default Corridor
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between p-4 rounded-lg bg-secondary/20 border border-border/50">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-success/10">
                    <MapPin className="h-4 w-4 text-success" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Gachibowli</p>
                    <p className="text-xs text-muted-foreground">Start Point</p>
                  </div>
                </div>
                
                <div className="flex-1 mx-4 border-t-2 border-dashed border-primary/30" />
                
                <div className="flex items-center gap-3">
                  <div>
                    <p className="text-sm font-medium text-right">LB Nagar</p>
                    <p className="text-xs text-muted-foreground text-right">Destination</p>
                  </div>
                  <div className="p-2 rounded-full bg-emergency/10">
                    <MapPin className="h-4 w-4 text-emergency" />
                  </div>
                </div>
              </div>
              <p className="text-xs text-muted-foreground text-center mt-3">
                Multiple routes available: Via Mehdipatnam • Via Kukatpally • Via Outer Ring Road
              </p>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
