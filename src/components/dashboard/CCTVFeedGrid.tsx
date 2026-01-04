import { useState, useEffect } from "react";
import { Video, Circle, Eye } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface CCTVFeed {
  id: string;
  location: string;
  status: "active" | "processing" | "offline";
  vehicleCount: number;
  density: "clear" | "moderate" | "heavy" | "congested";
}

const mockFeeds: CCTVFeed[] = [
  { id: "CAM-001", location: "Gachibowli Junction", status: "active", vehicleCount: 23, density: "moderate" },
  { id: "CAM-002", location: "Tolichowki Signal", status: "active", vehicleCount: 45, density: "heavy" },
  { id: "CAM-003", location: "Mehdipatnam Circle", status: "processing", vehicleCount: 67, density: "congested" },
  { id: "CAM-004", location: "Dilsukhnagar X-Road", status: "active", vehicleCount: 12, density: "clear" },
];

export function CCTVFeedGrid() {
  const [feeds, setFeeds] = useState(mockFeeds);

  // Simulate real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      setFeeds(prev => prev.map(feed => ({
        ...feed,
        vehicleCount: Math.max(5, feed.vehicleCount + Math.floor(Math.random() * 11) - 5),
      })));
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const getDensityColor = (density: CCTVFeed["density"]) => {
    switch (density) {
      case "clear": return "bg-success/10 text-success border-success/20";
      case "moderate": return "bg-warning/10 text-warning border-warning/20";
      case "heavy": return "bg-traffic-heavy/10 text-traffic-heavy border-traffic-heavy/20";
      case "congested": return "bg-emergency/10 text-emergency border-emergency/20";
    }
  };

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Video className="h-5 w-5 text-info" />
            CCTV Traffic Analysis
          </div>
          <Badge variant="outline" className="bg-success/10 text-success border-success/20">
            <Circle className="mr-1 h-2 w-2 fill-current" />
            YOLOv8 Active
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3">
          {feeds.map((feed) => (
            <div 
              key={feed.id}
              className="group relative rounded-lg border border-border bg-secondary/20 overflow-hidden transition-all duration-300 hover:border-primary/50"
            >
              {/* Simulated video feed placeholder */}
              <div className="relative aspect-video bg-gradient-to-br from-secondary to-background">
                {/* Grid overlay to simulate video */}
                <div className="absolute inset-0 bg-grid-pattern opacity-30" />
                
                {/* Scan line effect */}
                <div className="absolute inset-0 overflow-hidden">
                  <div className="absolute inset-x-0 h-px bg-primary/30 animate-[scan_3s_linear_infinite]" 
                    style={{ animation: "scan 3s linear infinite" }}
                  />
                </div>
                
                {/* Vehicle detection boxes simulation */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="flex gap-2">
                    {[...Array(Math.min(3, Math.ceil(feed.vehicleCount / 20)))].map((_, i) => (
                      <div 
                        key={i}
                        className="w-6 h-4 border border-success/60 rounded-sm"
                        style={{
                          animation: `pulse 2s infinite ${i * 0.3}s`,
                        }}
                      />
                    ))}
                  </div>
                </div>

                {/* Status indicator */}
                <div className="absolute top-2 left-2">
                  <div className={cn(
                    "flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium",
                    feed.status === "active" ? "bg-success/20 text-success" :
                    feed.status === "processing" ? "bg-warning/20 text-warning" :
                    "bg-muted text-muted-foreground"
                  )}>
                    <Circle className={cn(
                      "h-1.5 w-1.5 fill-current",
                      feed.status === "active" && "animate-pulse"
                    )} />
                    {feed.status === "active" ? "LIVE" : feed.status.toUpperCase()}
                  </div>
                </div>

                {/* Camera ID */}
                <div className="absolute top-2 right-2">
                  <span className="text-[10px] font-mono text-muted-foreground bg-background/80 px-1.5 py-0.5 rounded">
                    {feed.id}
                  </span>
                </div>

                {/* Hover overlay */}
                <div className="absolute inset-0 bg-background/80 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                  <Eye className="h-6 w-6 text-primary" />
                </div>
              </div>

              {/* Feed info */}
              <div className="p-2.5 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium truncate">{feed.location}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-muted-foreground">
                    Vehicles: <span className="font-mono text-foreground">{feed.vehicleCount}</span>
                  </span>
                  <Badge variant="outline" className={cn("text-[10px] h-5", getDensityColor(feed.density))}>
                    {feed.density}
                  </Badge>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
      
      <style>{`
        @keyframes scan {
          0% { top: 0; }
          100% { top: 100%; }
        }
      `}</style>
    </Card>
  );
}
