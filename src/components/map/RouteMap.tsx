import { useEffect, useRef, useState } from "react";
import { MapPin, Navigation, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface RouteMapProps {
  showAlternate?: boolean;
  activeRoute?: "primary" | "alternate";
}

// Simulated coordinates for Hyderabad route (Gachibowli to LB Nagar)
const routePoints = {
  primary: [
    { x: 15, y: 40, name: "Gachibowli" },
    { x: 25, y: 45, name: "Tolichowki" },
    { x: 40, y: 50, name: "Mehdipatnam" },
    { x: 55, y: 55, name: "Dilsukhnagar" },
    { x: 70, y: 50, name: "Kothapet" },
    { x: 85, y: 45, name: "LB Nagar" },
  ],
  alternate: [
    { x: 15, y: 40, name: "Gachibowli" },
    { x: 28, y: 30, name: "Kondapur" },
    { x: 45, y: 25, name: "KPHB" },
    { x: 60, y: 30, name: "Kukatpally" },
    { x: 72, y: 38, name: "Moosapet" },
    { x: 85, y: 45, name: "LB Nagar" },
  ],
};

// Traffic density zones
const trafficZones = [
  { x: 35, y: 48, radius: 8, density: "heavy" },
  { x: 52, y: 52, radius: 6, density: "moderate" },
  { x: 68, y: 48, radius: 5, density: "clear" },
];

export function RouteMap({ showAlternate = true, activeRoute = "primary" }: RouteMapProps) {
  const [vehiclePosition, setVehiclePosition] = useState(0);
  const animationRef = useRef<number>();

  useEffect(() => {
    const animate = () => {
      setVehiclePosition(prev => (prev + 0.5) % 100);
      animationRef.current = requestAnimationFrame(animate);
    };
    animationRef.current = requestAnimationFrame(animate);
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, []);

  const getPointOnPath = (progress: number, path: typeof routePoints.primary) => {
    const normalizedProgress = Math.min(Math.max(progress / 100, 0), 1);
    const totalSegments = path.length - 1;
    const segment = Math.floor(normalizedProgress * totalSegments);
    const segmentProgress = (normalizedProgress * totalSegments) - segment;
    
    if (segment >= totalSegments) return path[path.length - 1];
    
    const start = path[segment];
    const end = path[segment + 1];
    
    return {
      x: start.x + (end.x - start.x) * segmentProgress,
      y: start.y + (end.y - start.y) * segmentProgress,
      name: "",
    };
  };

  const vehiclePos = getPointOnPath(vehiclePosition, routePoints[activeRoute]);

  const createPathD = (points: typeof routePoints.primary) => {
    return points.reduce((acc, point, i) => {
      if (i === 0) return `M ${point.x} ${point.y}`;
      const prev = points[i - 1];
      const cpx = (prev.x + point.x) / 2;
      return `${acc} Q ${cpx} ${prev.y}, ${point.x} ${point.y}`;
    }, "");
  };

  return (
    <div className="map-container h-full min-h-[400px] bg-grid-pattern">
      {/* Map Header */}
      <div className="absolute top-4 left-4 right-4 z-10 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="bg-background/80 backdrop-blur-sm">
            <Navigation className="mr-1 h-3 w-3 text-primary" />
            Route Active
          </Badge>
        </div>
        
        <div className="flex gap-2">
          <Badge variant="outline" className="bg-success/10 text-success border-success/20">
            <div className="mr-1.5 h-2 w-2 rounded-full bg-success" />
            Primary: 12.3 km
          </Badge>
          {showAlternate && (
            <Badge variant="outline" className="bg-info/10 text-info border-info/20">
              <div className="mr-1.5 h-2 w-2 rounded-full bg-info" />
              Alternate: 15.8 km
            </Badge>
          )}
        </div>
      </div>

      {/* SVG Map */}
      <svg 
        viewBox="0 0 100 80" 
        className="h-full w-full"
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <filter id="glow-green" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="1" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="glow-blue" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="0.8" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <linearGradient id="primaryGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="hsl(142, 76%, 45%)" />
            <stop offset="100%" stopColor="hsl(142, 76%, 55%)" />
          </linearGradient>
          <linearGradient id="alternateGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="hsl(199, 89%, 48%)" />
            <stop offset="100%" stopColor="hsl(199, 89%, 58%)" />
          </linearGradient>
        </defs>

        {/* Traffic Zones */}
        {trafficZones.map((zone, i) => (
          <circle
            key={i}
            cx={zone.x}
            cy={zone.y}
            r={zone.radius}
            fill={
              zone.density === "heavy" ? "hsla(0, 84%, 55%, 0.2)" :
              zone.density === "moderate" ? "hsla(38, 92%, 50%, 0.2)" :
              "hsla(142, 76%, 45%, 0.15)"
            }
            stroke={
              zone.density === "heavy" ? "hsla(0, 84%, 55%, 0.4)" :
              zone.density === "moderate" ? "hsla(38, 92%, 50%, 0.4)" :
              "hsla(142, 76%, 45%, 0.3)"
            }
            strokeWidth="0.3"
          />
        ))}

        {/* Alternate Route */}
        {showAlternate && (
          <path
            d={createPathD(routePoints.alternate)}
            fill="none"
            stroke="url(#alternateGradient)"
            strokeWidth="0.8"
            strokeDasharray="2 1"
            opacity={activeRoute === "alternate" ? 1 : 0.4}
            filter="url(#glow-blue)"
          />
        )}

        {/* Primary Route */}
        <path
          d={createPathD(routePoints.primary)}
          fill="none"
          stroke="url(#primaryGradient)"
          strokeWidth={activeRoute === "primary" ? "1.2" : "0.8"}
          strokeLinecap="round"
          opacity={activeRoute === "primary" ? 1 : 0.4}
          filter="url(#glow-green)"
          className={activeRoute === "primary" ? "route-line-animated" : ""}
        />

        {/* Waypoints */}
        {routePoints.primary.map((point, i) => (
          <g key={`primary-${i}`}>
            <circle
              cx={point.x}
              cy={point.y}
              r={i === 0 || i === routePoints.primary.length - 1 ? 2.5 : 1.5}
              fill={i === 0 || i === routePoints.primary.length - 1 ? "hsl(142, 76%, 45%)" : "hsl(var(--muted))"}
              stroke="hsl(var(--background))"
              strokeWidth="0.5"
            />
            {(i === 0 || i === routePoints.primary.length - 1) && (
              <text
                x={point.x}
                y={point.y + 6}
                textAnchor="middle"
                fill="hsl(var(--foreground))"
                fontSize="3"
                fontWeight="600"
              >
                {point.name}
              </text>
            )}
          </g>
        ))}

        {/* Emergency Vehicle */}
        <g transform={`translate(${vehiclePos.x - 2}, ${vehiclePos.y - 2})`}>
          <circle r="3" cx="2" cy="2" fill="hsl(0, 84%, 55%)" opacity="0.3">
            <animate attributeName="r" values="3;5;3" dur="1s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.3;0.1;0.3" dur="1s" repeatCount="indefinite" />
          </circle>
          <rect
            width="4"
            height="2.5"
            rx="0.5"
            fill="hsl(0, 84%, 55%)"
            stroke="hsl(var(--foreground))"
            strokeWidth="0.2"
          />
          <rect x="0.5" y="-0.5" width="1" height="0.5" fill="hsl(199, 89%, 48%)" rx="0.1" />
          <rect x="2.5" y="-0.5" width="1" height="0.5" fill="hsl(0, 84%, 55%)" rx="0.1">
            <animate attributeName="opacity" values="1;0.3;1" dur="0.3s" repeatCount="indefinite" />
          </rect>
        </g>
      </svg>

      {/* Legend */}
      <div className="absolute bottom-4 left-4 flex flex-col gap-2">
        <div className="flex items-center gap-2 text-xs">
          <div className="h-2 w-6 rounded-full bg-traffic-clear" />
          <span className="text-muted-foreground">Clear</span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <div className="h-2 w-6 rounded-full bg-traffic-moderate" />
          <span className="text-muted-foreground">Moderate</span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <div className="h-2 w-6 rounded-full bg-traffic-congested" />
          <span className="text-muted-foreground">Congested</span>
        </div>
      </div>

      {/* ETA Display */}
      <div className="absolute bottom-4 right-4 rounded-lg border border-border bg-background/90 backdrop-blur-sm p-3">
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-primary" />
          <div>
            <p className="text-xs text-muted-foreground">Estimated Arrival</p>
            <p className="text-lg font-bold font-mono">8:42 min</p>
          </div>
        </div>
      </div>
    </div>
  );
}
