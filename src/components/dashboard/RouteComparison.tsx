import { Route, Clock, Gauge, TrendingDown, Check, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface RouteOption {
  id: string;
  name: string;
  distance: number;
  estimatedTime: number;
  trafficLevel: "clear" | "moderate" | "heavy";
  congestionPoints: number;
  isRecommended?: boolean;
  algorithm: "Dijkstra" | "A*";
}

interface RouteComparisonProps {
  routes: RouteOption[];
  selectedRoute: string | null;
  onSelectRoute: (id: string) => void;
}

const defaultRoutes: RouteOption[] = [
  {
    id: "route-1",
    name: "Via Mehdipatnam",
    distance: 12.3,
    estimatedTime: 8.5,
    trafficLevel: "moderate",
    congestionPoints: 2,
    isRecommended: true,
    algorithm: "A*",
  },
  {
    id: "route-2",
    name: "Via Kukatpally",
    distance: 15.8,
    estimatedTime: 14.2,
    trafficLevel: "heavy",
    congestionPoints: 4,
    algorithm: "Dijkstra",
  },
];

export function RouteComparison({ 
  routes = defaultRoutes, 
  selectedRoute, 
  onSelectRoute 
}: RouteComparisonProps) {
  const getTrafficStyles = (level: RouteOption["trafficLevel"]) => {
    switch (level) {
      case "clear": return { bg: "bg-success/10", text: "text-success", border: "border-success/20" };
      case "moderate": return { bg: "bg-warning/10", text: "text-warning", border: "border-warning/20" };
      case "heavy": return { bg: "bg-emergency/10", text: "text-emergency", border: "border-emergency/20" };
    }
  };

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <Route className="h-5 w-5 text-primary" />
          Route Analysis
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {routes.map((route) => {
          const trafficStyles = getTrafficStyles(route.trafficLevel);
          const isSelected = selectedRoute === route.id;

          return (
            <div
              key={route.id}
              className={cn(
                "relative rounded-xl border p-4 transition-all duration-300 cursor-pointer",
                isSelected
                  ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                  : "border-border hover:border-muted-foreground/30 hover:bg-accent/30",
                route.isRecommended && !isSelected && "border-success/30 bg-success/5"
              )}
              onClick={() => onSelectRoute(route.id)}
            >
              {route.isRecommended && (
                <Badge 
                  className="absolute -top-2.5 left-4 bg-success text-success-foreground border-0"
                >
                  <Check className="mr-1 h-3 w-3" />
                  Recommended
                </Badge>
              )}

              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-semibold">{route.name}</h4>
                    <p className="text-xs text-muted-foreground">
                      Computed using {route.algorithm} algorithm
                    </p>
                  </div>
                  <Badge 
                    variant="outline" 
                    className={cn("text-xs", trafficStyles.bg, trafficStyles.text, trafficStyles.border)}
                  >
                    {route.trafficLevel}
                  </Badge>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Route className="h-3.5 w-3.5" />
                      <span className="text-xs">Distance</span>
                    </div>
                    <p className="text-lg font-bold font-mono">{route.distance} km</p>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Clock className="h-3.5 w-3.5" />
                      <span className="text-xs">ETA</span>
                    </div>
                    <p className="text-lg font-bold font-mono">{route.estimatedTime} min</p>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      <span className="text-xs">Congestion</span>
                    </div>
                    <p className="text-lg font-bold font-mono">{route.congestionPoints}</p>
                  </div>
                </div>

                {isSelected && (
                  <Button variant="glow" size="sm" className="w-full mt-2">
                    <Gauge className="mr-2 h-4 w-4" />
                    Start Navigation
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
