import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Navigation, RefreshCw, Clock, Route } from "lucide-react";

// Real coordinates for Hyderabad route (Gachibowli to LB Nagar)
const GACHIBOWLI = { lat: 17.4400, lng: 78.3489 };
const LB_NAGAR = { lat: 17.3457, lng: 78.5522 };

// Multiple route options with real intermediate points - base times without traffic
const ROUTES = {
  primary: {
    name: "Via Mehdipatnam",
    color: "#22c55e",
    distance: 12.3,
    baseTime: 8, // Base time in minutes without traffic
    coordinates: [
      [17.4400, 78.3489], // Gachibowli
      [17.4285, 78.3650], // Gachibowli Junction
      [17.4150, 78.3820], // Tolichowki
      [17.3950, 78.4150], // Mehdipatnam
      [17.3850, 78.4450], // Attapur
      [17.3700, 78.4800], // Dilsukhnagar
      [17.3550, 78.5150], // Kothapet
      [17.3457, 78.5522], // LB Nagar
    ],
  },
  alternate1: {
    name: "Via Kukatpally",
    color: "#3b82f6",
    distance: 18.5,
    baseTime: 14,
    coordinates: [
      [17.4400, 78.3489], // Gachibowli
      [17.4600, 78.3700], // Kondapur
      [17.4850, 78.4100], // KPHB
      [17.4950, 78.4500], // Kukatpally
      [17.4800, 78.4900], // Moosapet
      [17.4400, 78.5100], // Secunderabad area
      [17.3900, 78.5300], // Malakpet
      [17.3457, 78.5522], // LB Nagar
    ],
  },
  alternate2: {
    name: "Via Outer Ring Road",
    color: "#f59e0b",
    distance: 22.1,
    baseTime: 16,
    coordinates: [
      [17.4400, 78.3489], // Gachibowli
      [17.4100, 78.3300], // Financial District
      [17.3700, 78.3200], // Narsingi
      [17.3200, 78.3600], // Shamshabad direction
      [17.3000, 78.4200], // ORR South
      [17.3100, 78.4800], // Chandrayangutta
      [17.3300, 78.5200], // Sagar Ring Road
      [17.3457, 78.5522], // LB Nagar
    ],
  },
};

// Simulated CCTV camera locations with live traffic data
const CCTV_LOCATIONS = [
  { id: "cam-1", lat: 17.4285, lng: 78.3650, name: "Gachibowli Junction", vehicleCount: 45, density: 72, route: "primary" },
  { id: "cam-2", lat: 17.4150, lng: 78.3820, name: "Tolichowki", vehicleCount: 38, density: 58, route: "primary" },
  { id: "cam-3", lat: 17.3950, lng: 78.4150, name: "Mehdipatnam", vehicleCount: 67, density: 89, route: "primary" },
  { id: "cam-4", lat: 17.3850, lng: 78.4450, name: "Attapur", vehicleCount: 32, density: 45, route: "primary" },
  { id: "cam-5", lat: 17.3700, lng: 78.4800, name: "Dilsukhnagar", vehicleCount: 55, density: 78, route: "primary" },
  { id: "cam-6", lat: 17.3550, lng: 78.5150, name: "Kothapet", vehicleCount: 28, density: 35, route: "primary" },
  { id: "cam-7", lat: 17.4600, lng: 78.3700, name: "Kondapur", vehicleCount: 42, density: 52, route: "alternate1" },
  { id: "cam-8", lat: 17.4850, lng: 78.4100, name: "KPHB", vehicleCount: 35, density: 40, route: "alternate1" },
  { id: "cam-9", lat: 17.4100, lng: 78.3300, name: "Financial District", vehicleCount: 25, density: 30, route: "alternate2" },
  { id: "cam-10", lat: 17.3000, lng: 78.4200, name: "ORR South", vehicleCount: 30, density: 35, route: "alternate2" },
];

// Accident/incident locations for simulation
const INCIDENTS = [
  { id: "inc-1", lat: 17.3950, lng: 78.4150, type: "accident", description: "Two-vehicle collision", route: "primary" },
];

// Calculate route congestion and estimated time based on live traffic
const calculateRouteMetrics = (routeKey: string, cctvData: typeof CCTV_LOCATIONS, hasIncident: boolean) => {
  const route = ROUTES[routeKey as keyof typeof ROUTES];
  if (!route) return { congestion: 0, estimatedTime: 0 };
  
  // Max congestion if accident on this route
  if (hasIncident && INCIDENTS.some(inc => inc.route === routeKey)) {
    return { congestion: 100, estimatedTime: route.baseTime * 3 }; // Triple time due to accident
  }
  
  const routeCameras = cctvData.filter(cam => cam.route === routeKey);
  const avgCongestion = routeCameras.length > 0 
    ? Math.round(routeCameras.reduce((sum, cam) => sum + cam.density, 0) / routeCameras.length)
    : 25; // Default low congestion for routes without cameras
  
  // Calculate time based on congestion: higher congestion = longer time
  const congestionMultiplier = 1 + (avgCongestion / 100) * 0.8; // 0-80% time increase
  const estimatedTime = Math.round(route.baseTime * congestionMultiplier);
  
  return { congestion: avgCongestion, estimatedTime };
};

// Find fastest route based on estimated travel time
const findFastestRoute = (cctvData: typeof CCTV_LOCATIONS, hasIncident: boolean): { route: string; allRoutes: Array<{ key: string; congestion: number; time: number }> } => {
  const allRoutes = Object.keys(ROUTES).map(key => {
    const metrics = calculateRouteMetrics(key, cctvData, hasIncident);
    return {
      key,
      congestion: metrics.congestion,
      time: metrics.estimatedTime,
    };
  });
  
  // Sort by estimated time (shortest first)
  allRoutes.sort((a, b) => a.time - b.time);
  
  return { route: allRoutes[0].key, allRoutes };
};

interface LeafletMapProps {
  showAlternate?: boolean;
  activeRoute?: "primary" | "alternate1" | "alternate2";
  accidentDetected?: boolean;
  onRouteChange?: (route: string) => void;
}

export function LeafletMap({ 
  showAlternate = true, 
  activeRoute = "primary",
  accidentDetected = false,
  onRouteChange
}: LeafletMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const [vehiclePosition, setVehiclePosition] = useState(0);
  const vehicleMarkerRef = useRef<L.Marker | null>(null);
  const routeLayersRef = useRef<{ [key: string]: L.Polyline }>({});
  const [showIncident, setShowIncident] = useState(accidentDetected);
  const [liveCCTVData, setLiveCCTVData] = useState(CCTV_LOCATIONS);
  const [fastestRoute, setFastestRoute] = useState<string>("primary");
  const [allRoutesInfo, setAllRoutesInfo] = useState<Array<{ key: string; congestion: number; time: number }>>([]);
  const [showAllRoutes, setShowAllRoutes] = useState(false);

  useEffect(() => {
    setShowIncident(accidentDetected);
  }, [accidentDetected]);

  // Simulate live traffic updates and auto-reroute when congestion detected
  useEffect(() => {
    const updateTraffic = () => {
      setLiveCCTVData(prev => 
        prev.map(cam => ({
          ...cam,
          vehicleCount: Math.max(10, Math.min(100, cam.vehicleCount + Math.floor(Math.random() * 20 - 10))),
          density: Math.max(15, Math.min(95, cam.density + Math.floor(Math.random() * 15 - 7))),
        }))
      );
    };

    const interval = setInterval(updateTraffic, 4000);
    return () => clearInterval(interval);
  }, []);

  // Find fastest route based on live traffic and update route info
  useEffect(() => {
    const { route, allRoutes } = findFastestRoute(liveCCTVData, showIncident);
    setFastestRoute(route);
    setAllRoutesInfo(allRoutes);
    
    // Auto-reroute if current route has significantly higher time
    const currentRouteInfo = allRoutes.find(r => r.key === activeRoute);
    const fastestRouteInfo = allRoutes[0];
    if (currentRouteInfo && fastestRouteInfo && currentRouteInfo.time > fastestRouteInfo.time + 3 && route !== activeRoute) {
      // Only auto-reroute if difference is more than 3 minutes
      onRouteChange?.(route);
    }
  }, [liveCCTVData, showIncident, activeRoute, onRouteChange]);

  // Initialize map
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    // Create map centered between Gachibowli and LB Nagar
    const map = L.map(mapRef.current, {
      center: [17.39, 78.45],
      zoom: 12,
      zoomControl: true,
      scrollWheelZoom: true,
    });

    // Add OpenStreetMap tiles
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map);

    // Custom dark style overlay for better visibility
    map.getContainer().style.filter = "hue-rotate(180deg) invert(0.9)";

    mapInstanceRef.current = map;

    // Add start and end markers
    const startIcon = L.divIcon({
      className: "custom-marker",
      html: `<div style="background: #22c55e; width: 24px; height: 24px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center;">
        <span style="color: white; font-size: 12px; font-weight: bold;">S</span>
      </div>`,
      iconSize: [24, 24],
      iconAnchor: [12, 12],
    });

    const endIcon = L.divIcon({
      className: "custom-marker",
      html: `<div style="background: #ef4444; width: 24px; height: 24px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center;">
        <span style="color: white; font-size: 12px; font-weight: bold;">E</span>
      </div>`,
      iconSize: [24, 24],
      iconAnchor: [12, 12],
    });

    L.marker([GACHIBOWLI.lat, GACHIBOWLI.lng], { icon: startIcon })
      .addTo(map)
      .bindPopup("<b>Gachibowli</b><br>Start Point");

    L.marker([LB_NAGAR.lat, LB_NAGAR.lng], { icon: endIcon })
      .addTo(map)
      .bindPopup("<b>LB Nagar</b><br>Destination");

    // Add CCTV camera markers
    CCTV_LOCATIONS.forEach((cam) => {
      const camIcon = L.divIcon({
        className: "cctv-marker",
        html: `<div style="background: rgba(59, 130, 246, 0.9); width: 20px; height: 20px; border-radius: 4px; border: 2px solid white; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 6px rgba(0,0,0,0.3);">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="white">
            <path d="M15.5 8.5a3.5 3.5 0 1 1-7 0 3.5 3.5 0 0 1 7 0Z"/>
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2Zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8Z"/>
          </svg>
        </div>`,
        iconSize: [20, 20],
        iconAnchor: [10, 10],
      });

      const densityColor = cam.density > 70 ? "#ef4444" : cam.density > 50 ? "#f59e0b" : "#22c55e";

      L.marker([cam.lat, cam.lng], { icon: camIcon })
        .addTo(map)
        .bindPopup(`
          <div style="min-width: 150px;">
            <b>${cam.name}</b><br>
            <small style="color: #666;">AI City Track 4 Feed</small><br><br>
            <div style="display: flex; justify-content: space-between;">
              <span>Vehicles:</span>
              <strong>${cam.vehicleCount}</strong>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span>Density:</span>
              <span style="color: ${densityColor}; font-weight: bold;">${cam.density}%</span>
            </div>
          </div>
        `);
    });

    // Draw routes
    Object.entries(ROUTES).forEach(([key, route]) => {
      const coords = route.coordinates as [number, number][];
      const polyline = L.polyline(coords, {
        color: route.color,
        weight: key === "primary" ? 6 : 4,
        opacity: key === "primary" ? 1 : 0.6,
        dashArray: key === "primary" ? undefined : "10, 10",
      }).addTo(map);

      const routeInfo = allRoutesInfo.find(r => r.key === key);
      polyline.bindPopup(`
        <b>${route.name}</b><br>
        Distance: ${route.distance} km<br>
        Est. Time: ${routeInfo?.time || route.baseTime} min
      `);

      polyline.on("click", () => {
        onRouteChange?.(key);
      });

      routeLayersRef.current[key] = polyline;
    });

    // Emergency vehicle marker
    const vehicleIcon = L.divIcon({
      className: "vehicle-marker",
      html: `<div style="position: relative;">
        <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 40px; height: 40px; background: rgba(239, 68, 68, 0.3); border-radius: 50%; animation: pulse 1s infinite;"></div>
        <div style="background: #ef4444; width: 32px; height: 20px; border-radius: 6px; border: 2px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; position: relative;">
          <div style="position: absolute; top: -6px; left: 4px; width: 8px; height: 4px; background: #3b82f6; border-radius: 2px;"></div>
          <div style="position: absolute; top: -6px; right: 4px; width: 8px; height: 4px; background: #ef4444; border-radius: 2px; animation: blink 0.3s infinite;"></div>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
            <path d="M3 17h2v-7a7 7 0 1 1 14 0v7h2v2H3v-2Zm4-5a5 5 0 0 1 10 0v5H7v-5Z"/>
          </svg>
        </div>
      </div>`,
      iconSize: [32, 20],
      iconAnchor: [16, 10],
    });

    const vehicleMarker = L.marker([GACHIBOWLI.lat, GACHIBOWLI.lng], { icon: vehicleIcon }).addTo(map);
    vehicleMarkerRef.current = vehicleMarker;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [onRouteChange]);

  // Add incident marker when accident detected
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    if (showIncident) {
      INCIDENTS.forEach((incident) => {
        const incidentIcon = L.divIcon({
          className: "incident-marker",
          html: `<div style="position: relative;">
            <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 50px; height: 50px; background: rgba(239, 68, 68, 0.4); border-radius: 50%; animation: pulse 0.5s infinite;"></div>
            <div style="background: #ef4444; width: 28px; height: 28px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center;">
              <span style="color: white; font-size: 16px; font-weight: bold;">!</span>
            </div>
          </div>`,
          iconSize: [28, 28],
          iconAnchor: [14, 14],
        });

        L.marker([incident.lat, incident.lng], { icon: incidentIcon })
          .addTo(mapInstanceRef.current!)
          .bindPopup(`
            <div style="color: #ef4444;">
              <b>⚠️ ${incident.type.toUpperCase()}</b><br>
              ${incident.description}<br><br>
              <em>Alternate route recommended</em>
            </div>
          `)
          .openPopup();
      });
    }
  }, [showIncident]);

  // Animate vehicle along route
  useEffect(() => {
    const route = ROUTES[activeRoute as keyof typeof ROUTES];
    if (!route || !vehicleMarkerRef.current) return;

    const coords = route.coordinates as [number, number][];
    const animate = () => {
      setVehiclePosition((prev) => {
        const next = (prev + 0.2) % 100;
        const totalPoints = coords.length - 1;
        const segment = Math.floor((next / 100) * totalPoints);
        const progress = ((next / 100) * totalPoints) % 1;

        if (segment < totalPoints) {
          const start = coords[segment];
          const end = coords[segment + 1];
          const lat = start[0] + (end[0] - start[0]) * progress;
          const lng = start[1] + (end[1] - start[1]) * progress;
          vehicleMarkerRef.current?.setLatLng([lat, lng]);
        }
        return next;
      });
    };

    const interval = setInterval(animate, 100);
    return () => clearInterval(interval);
  }, [activeRoute]);

  // Update route styling - show only fastest route unless user expands
  useEffect(() => {
    Object.entries(routeLayersRef.current).forEach(([key, polyline]) => {
      if (key === activeRoute) {
        polyline.setStyle({ weight: 6, opacity: 1, dashArray: undefined });
        polyline.bringToFront();
      } else if (showAllRoutes) {
        polyline.setStyle({ weight: 4, opacity: 0.5, dashArray: "10, 10" });
      } else {
        polyline.setStyle({ opacity: 0 });
      }
    });
  }, [activeRoute, showAllRoutes]);

  // Get current route info from allRoutesInfo
  const getRouteInfo = (routeKey: string) => {
    return allRoutesInfo.find(r => r.key === routeKey) || { congestion: 0, time: 0 };
  };

  // Handle manual reroute
  const handleReroute = () => {
    if (fastestRoute !== activeRoute) {
      onRouteChange?.(fastestRoute);
    }
  };

  return (
    <div className="relative h-full min-h-[450px] rounded-lg overflow-hidden">
      {/* Map Container */}
      <div ref={mapRef} className="absolute inset-0 z-0" />

      {/* Overlay Controls */}
      <div className="absolute top-4 left-4 right-4 z-[1000] flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-2 pointer-events-auto">
          <Badge variant="outline" className="bg-background/90 backdrop-blur-sm border-primary/30">
            <Navigation className="mr-1 h-3 w-3 text-primary" />
            Live Traffic
          </Badge>
          <Badge variant="outline" className="bg-background/90 backdrop-blur-sm border-success/30">
            <Route className="mr-1 h-3 w-3 text-success" />
            Fastest Path Active
          </Badge>
        </div>

        {/* Reroute Button */}
        <div className="flex gap-2 pointer-events-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={handleReroute}
            className={`bg-background/90 backdrop-blur-sm ${
              fastestRoute !== activeRoute 
                ? "border-warning text-warning hover:bg-warning/20 animate-pulse" 
                : "border-muted"
            }`}
          >
            <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${fastestRoute !== activeRoute ? "animate-spin" : ""}`} />
            {fastestRoute !== activeRoute ? "Reroute Now" : "Reroute"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAllRoutes(!showAllRoutes)}
            className="bg-background/90 backdrop-blur-sm"
          >
            <Route className="mr-1.5 h-3.5 w-3.5" />
            {showAllRoutes ? "Hide Routes" : "Show All Routes"}
          </Button>
        </div>
      </div>

      {/* Route Legend - Only show when expanded */}
      {showAllRoutes && (
        <div className="absolute bottom-4 left-4 z-[1000] pointer-events-auto">
          <Card className="bg-background/95 backdrop-blur-sm border-border/50 p-3">
            <p className="text-xs font-semibold mb-2 text-muted-foreground">All Routes (by travel time)</p>
            <div className="space-y-1.5">
              {allRoutesInfo.map((routeInfo, index) => {
                const route = ROUTES[routeInfo.key as keyof typeof ROUTES];
                const congestionColor = routeInfo.congestion >= 80 ? "text-emergency" : routeInfo.congestion >= 50 ? "text-warning" : "text-success";
                const isFastest = index === 0;
                return (
                  <div
                    key={routeInfo.key}
                    className={`flex items-center gap-2 text-xs cursor-pointer p-1.5 rounded transition-colors ${
                      activeRoute === routeInfo.key ? "bg-primary/10" : "hover:bg-muted/50"
                    }`}
                    onClick={() => onRouteChange?.(routeInfo.key)}
                  >
                    <div
                      className="h-1 w-6 rounded-full"
                      style={{ backgroundColor: route.color }}
                    />
                    <span className={activeRoute === routeInfo.key ? "font-semibold flex-1" : "text-muted-foreground flex-1"}>
                      {route.name}
                    </span>
                    <span className="font-mono text-[10px] text-foreground">
                      {routeInfo.time} min
                    </span>
                    <span className={`font-mono text-[10px] ${congestionColor}`}>
                      {routeInfo.congestion}%
                    </span>
                    {isFastest && (
                      <Badge variant="outline" className="text-[9px] px-1 py-0 bg-success/20 border-success/30 text-success">
                        FASTEST
                      </Badge>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      )}

      {/* Active Route Info */}
      <div className="absolute bottom-4 left-4 z-[1000] pointer-events-auto">
        {!showAllRoutes && (
          <Card className="bg-background/95 backdrop-blur-sm border-success/50 p-3">
            <div className="flex items-center gap-3">
              <div
                className="h-3 w-3 rounded-full"
                style={{ backgroundColor: ROUTES[activeRoute as keyof typeof ROUTES]?.color }}
              />
              <div>
                <p className="text-xs text-muted-foreground">Active Route</p>
                <p className="text-sm font-semibold">
                  {ROUTES[activeRoute as keyof typeof ROUTES]?.name}
                </p>
              </div>
            </div>
          </Card>
        )}
      </div>

      {/* ETA Display */}
      <div className="absolute bottom-4 right-4 z-[1000] pointer-events-auto">
        <Card className="bg-background/95 backdrop-blur-sm border-border/50 p-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-success/10">
              <Clock className="h-4 w-4 text-success" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Estimated Arrival</p>
              <div className="flex items-center gap-2">
                <p className="text-lg font-bold font-mono text-success">
                  {getRouteInfo(activeRoute).time || ROUTES[activeRoute as keyof typeof ROUTES]?.baseTime} min
                </p>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
