import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Navigation, RefreshCw, Clock, Route, MapPin, Loader2, Wifi, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { useTomTomTraffic } from "@/hooks/useTomTomTraffic";

// Default coordinates for Hyderabad route (Gachibowli to LB Nagar)
const DEFAULT_SOURCE = { lat: 17.4400, lng: 78.3489 };
const LB_NAGAR = { lat: 17.3457, lng: 78.5522 };

// Route definitions following SNSEV paper structure
const ROUTE_DEFINITIONS = [
  {
    key: "primary",
    name: "Via Mehdipatnam",
    color: "#22c55e",
    distance: 12.3,
    baseTime: 8,
    coordinates: [
      [17.4400, 78.3489], // Gachibowli
      [17.4285, 78.3650], // Gachibowli Junction
      [17.4150, 78.3820], // Tolichowki
      [17.3950, 78.4150], // Mehdipatnam
      [17.3850, 78.4450], // Attapur
      [17.3700, 78.4800], // Dilsukhnagar
      [17.3550, 78.5150], // Kothapet
      [17.3457, 78.5522], // LB Nagar
    ] as [number, number][],
  },
  {
    key: "alternate1",
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
    ] as [number, number][],
  },
  {
    key: "alternate2",
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
    ] as [number, number][],
  },
];

interface LeafletMapProps {
  showAlternate?: boolean;
  activeRoute?: string;
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
  const incidentMarkersRef = useRef<L.Marker[]>([]);
  const startMarkerRef = useRef<L.Marker | null>(null);
  const [showAllRoutes, setShowAllRoutes] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isLocating, setIsLocating] = useState(false);

  // Use TomTom traffic data hook - SNSEV approach
  const {
    routesWithTraffic,
    fastestRoute,
    getIncidentsForRoute,
    isLoading,
    lastUpdate,
    error,
    refreshTrafficData,
    checkForBetterRoute,
  } = useTomTomTraffic(ROUTE_DEFINITIONS);

  // Get current source location (user location or default)
  const sourceLocation = userLocation || DEFAULT_SOURCE;

  // Check for better route and auto-reroute
  useEffect(() => {
    const betterRoute = checkForBetterRoute(activeRoute);
    if (betterRoute && betterRoute !== activeRoute) {
      const betterRouteData = routesWithTraffic.find(r => r.key === betterRoute);
      const currentRouteData = routesWithTraffic.find(r => r.key === activeRoute);
      
      if (betterRouteData && currentRouteData) {
        const timeSaved = currentRouteData.estimatedTime - betterRouteData.estimatedTime;
        toast.info(
          `Faster route found: ${betterRouteData.name} saves ${timeSaved} min`,
          { 
            action: {
              label: "Switch",
              onClick: () => onRouteChange?.(betterRoute)
            }
          }
        );
      }
    }
  }, [routesWithTraffic, activeRoute, checkForBetterRoute, onRouteChange]);

  // Initialize map
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    const map = L.map(mapRef.current, {
      center: [17.39, 78.45],
      zoom: 12,
      zoomControl: true,
      scrollWheelZoom: true,
    });

    // Add TomTom base map tiles for consistency
    L.tileLayer("https://api.tomtom.com/map/1/tile/basic/main/{z}/{x}/{y}.png?key=YOUR_KEY_HERE&tileSize=256", {
      attribution: '&copy; TomTom',
      maxZoom: 19,
    }).addTo(map);

    // Fallback to OpenStreetMap if TomTom tiles fail
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);

    // Dark style overlay
    map.getContainer().style.filter = "hue-rotate(180deg) invert(0.9)";

    mapInstanceRef.current = map;

    // Start marker
    const startIcon = L.divIcon({
      className: "custom-marker",
      html: `<div style="background: #22c55e; width: 24px; height: 24px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center;">
        <span style="color: white; font-size: 12px; font-weight: bold;">S</span>
      </div>`,
      iconSize: [24, 24],
      iconAnchor: [12, 12],
    });

    // End marker
    const endIcon = L.divIcon({
      className: "custom-marker",
      html: `<div style="background: #ef4444; width: 24px; height: 24px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center;">
        <span style="color: white; font-size: 12px; font-weight: bold;">E</span>
      </div>`,
      iconSize: [24, 24],
      iconAnchor: [12, 12],
    });

    const startMarker = L.marker([sourceLocation.lat, sourceLocation.lng], { icon: startIcon })
      .addTo(map)
      .bindPopup(userLocation ? "<b>Your Location</b><br>Start Point" : "<b>Gachibowli</b><br>Start Point");
    startMarkerRef.current = startMarker;

    L.marker([LB_NAGAR.lat, LB_NAGAR.lng], { icon: endIcon })
      .addTo(map)
      .bindPopup("<b>LB Nagar</b><br>Destination");

    // Draw routes
    ROUTE_DEFINITIONS.forEach((route) => {
      const polyline = L.polyline(route.coordinates, {
        color: route.color,
        weight: route.key === "primary" ? 6 : 4,
        opacity: route.key === "primary" ? 1 : 0.6,
        dashArray: route.key === "primary" ? undefined : "10, 10",
      }).addTo(map);

      polyline.on("click", () => {
        onRouteChange?.(route.key);
      });

      routeLayersRef.current[route.key] = polyline;
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

    const vehicleMarker = L.marker([sourceLocation.lat, sourceLocation.lng], { icon: vehicleIcon }).addTo(map);
    vehicleMarkerRef.current = vehicleMarker;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [onRouteChange, sourceLocation, userLocation]);

  // Update incident markers when incidents on active route change
  const activeRouteIncidents = getIncidentsForRoute(activeRoute);
  
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    // Clear existing incident markers
    incidentMarkersRef.current.forEach(marker => marker.remove());
    incidentMarkersRef.current = [];

    // Only show incidents on the currently active route
    activeRouteIncidents.forEach((incident) => {
      // Safely get incident type as string
      const incidentType = typeof incident.type === 'string' 
        ? incident.type.toUpperCase() 
        : String(incident.type || 'INCIDENT');
      
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

      const marker = L.marker([incident.from.lat, incident.from.lng], { icon: incidentIcon })
        .addTo(mapInstanceRef.current!)
        .bindPopup(`
          <div style="color: #ef4444;">
            <b>⚠️ ${incidentType}</b><br>
            ${incident.description || 'Traffic incident reported'}<br>
            <small>Delay: ${Math.round((incident.delay || 0) / 60)} min</small>
          </div>
        `);

      incidentMarkersRef.current.push(marker);
    });
  }, [activeRouteIncidents, activeRoute]);

  // Animate vehicle along route
  useEffect(() => {
    const route = ROUTE_DEFINITIONS.find(r => r.key === activeRoute);
    if (!route || !vehicleMarkerRef.current) return;

    const coords = route.coordinates;
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

  // Update route styling
  useEffect(() => {
    Object.entries(routeLayersRef.current).forEach(([key, polyline]) => {
      const routeData = routesWithTraffic.find(r => r.key === key);
      
      if (key === activeRoute) {
        polyline.setStyle({ weight: 6, opacity: 1, dashArray: undefined });
        polyline.bringToFront();
        
        // Update popup with real traffic data
        if (routeData) {
          const route = ROUTE_DEFINITIONS.find(r => r.key === key);
          polyline.setPopupContent(`
            <b>${route?.name}</b><br>
            Distance: ${route?.distance} km<br>
            <span style="color: ${routeData.congestion > 60 ? '#ef4444' : routeData.congestion > 30 ? '#f59e0b' : '#22c55e'}">
              Traffic: ${routeData.congestion}% congested
            </span><br>
            <b>Est. Time: ${routeData.estimatedTime} min</b>
          `);
        }
      } else if (showAllRoutes) {
        polyline.setStyle({ weight: 4, opacity: 0.5, dashArray: "10, 10" });
      } else {
        polyline.setStyle({ opacity: 0 });
      }
    });
  }, [activeRoute, showAllRoutes, routesWithTraffic]);

  // Handle manual reroute
  const handleReroute = useCallback(() => {
    if (fastestRoute && fastestRoute !== activeRoute) {
      onRouteChange?.(fastestRoute);
      toast.success("Switched to fastest route based on live traffic");
    } else {
      refreshTrafficData();
      toast.info("Traffic data refreshed");
    }
  }, [fastestRoute, activeRoute, onRouteChange, refreshTrafficData]);

  // Handle use my location
  const handleUseMyLocation = useCallback(() => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser");
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const newLocation = { lat: latitude, lng: longitude };
        setUserLocation(newLocation);
        
        if (startMarkerRef.current && mapInstanceRef.current) {
          startMarkerRef.current.setLatLng([latitude, longitude]);
          mapInstanceRef.current.panTo([latitude, longitude]);
        }
        
        setVehiclePosition(0);
        if (vehicleMarkerRef.current) {
          vehicleMarkerRef.current.setLatLng([latitude, longitude]);
        }
        
        toast.success("Location updated to your current position");
        setIsLocating(false);
      },
      (error) => {
        let message = "Unable to get your location";
        switch (error.code) {
          case error.PERMISSION_DENIED:
            message = "Location permission denied";
            break;
          case error.POSITION_UNAVAILABLE:
            message = "Location unavailable";
            break;
          case error.TIMEOUT:
            message = "Location request timed out";
            break;
        }
        toast.error(message);
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }, []);

  // Get active route data
  const activeRouteData = useMemo(() => {
    return routesWithTraffic.find(r => r.key === activeRoute);
  }, [routesWithTraffic, activeRoute]);

  const canReroute = fastestRoute && fastestRoute !== activeRoute;

  return (
    <div className="relative h-full min-h-[450px] rounded-lg overflow-hidden">
      {/* Map Container */}
      <div ref={mapRef} className="absolute inset-0 z-0" />

      {/* Top Controls */}
      <div className="absolute top-4 left-4 right-4 z-[1000] flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-2 pointer-events-auto">
          <Badge variant="outline" className="bg-background/90 backdrop-blur-sm border-primary/30">
            <Wifi className={`mr-1 h-3 w-3 ${isLoading ? 'animate-pulse' : ''} text-primary`} />
            TomTom Live
          </Badge>
          {lastUpdate && (
            <Badge variant="outline" className="bg-background/90 backdrop-blur-sm border-muted text-muted-foreground text-xs">
              Updated: {lastUpdate.toLocaleTimeString()}
            </Badge>
          )}
          {activeRouteIncidents.length > 0 && (
            <Badge variant="outline" className="bg-destructive/10 backdrop-blur-sm border-destructive/30 text-destructive">
              <AlertTriangle className="mr-1 h-3 w-3" />
              {activeRouteIncidents.length} Incident{activeRouteIncidents.length > 1 ? 's' : ''} on route
            </Badge>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 pointer-events-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={handleReroute}
            disabled={isLoading}
            className={`bg-background/90 backdrop-blur-sm ${
              canReroute 
                ? "border-warning text-warning hover:bg-warning/20 animate-pulse" 
                : "border-muted"
            }`}
          >
            <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            {canReroute ? "Reroute Now" : "Refresh"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAllRoutes(!showAllRoutes)}
            className="bg-background/90 backdrop-blur-sm"
          >
            <Route className="mr-1.5 h-3.5 w-3.5" />
            {showAllRoutes ? "Hide Routes" : "Show All"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleUseMyLocation}
            disabled={isLocating}
            className={`bg-background/90 backdrop-blur-sm ${userLocation ? "border-success text-success" : ""}`}
          >
            {isLocating ? (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            ) : (
              <MapPin className="mr-1.5 h-3.5 w-3.5" />
            )}
            {isLocating ? "Locating..." : userLocation ? "Located" : "My Location"}
          </Button>
        </div>
      </div>

      {/* Route Legend - All routes sorted by time */}
      {showAllRoutes && (
        <div className="absolute bottom-4 left-4 z-[1000] pointer-events-auto">
          <Card className="bg-background/95 backdrop-blur-sm border-border/50 p-3 max-w-xs">
            <p className="text-xs font-semibold mb-2 text-muted-foreground">
              Routes by Shortest Time (SNSEV)
            </p>
            <div className="space-y-1.5">
              {routesWithTraffic.map((route, index) => {
                const congestionColor = route.congestion >= 60 ? "text-destructive" : route.congestion >= 30 ? "text-warning" : "text-success";
                const isFastest = index === 0;
                const routeDef = ROUTE_DEFINITIONS.find(r => r.key === route.key);
                
                return (
                  <div
                    key={route.key}
                    className={`flex items-center gap-2 text-xs cursor-pointer p-1.5 rounded transition-colors ${
                      activeRoute === route.key ? "bg-primary/10" : "hover:bg-muted/50"
                    }`}
                    onClick={() => onRouteChange?.(route.key)}
                  >
                    <div
                      className="h-1 w-6 rounded-full flex-shrink-0"
                      style={{ backgroundColor: routeDef?.color }}
                    />
                    <span className={`${activeRoute === route.key ? "font-semibold" : "text-muted-foreground"} flex-1 truncate`}>
                      {routeDef?.name}
                    </span>
                    <span className="font-mono text-[10px] text-foreground font-bold">
                      {route.estimatedTime} min
                    </span>
                    <span className={`font-mono text-[10px] ${congestionColor}`}>
                      {route.congestion}%
                    </span>
                    {isFastest && (
                      <Badge variant="outline" className="text-[9px] px-1 py-0 bg-success/20 border-success/30 text-success flex-shrink-0">
                        FASTEST
                      </Badge>
                    )}
                  </div>
                );
              })}
            </div>
            {error && (
              <p className="text-[10px] text-destructive mt-2">Using estimated data</p>
            )}
          </Card>
        </div>
      )}

      {/* Active Route Info */}
      {!showAllRoutes && (
        <div className="absolute bottom-4 left-4 z-[1000] pointer-events-auto">
          <Card className="bg-background/95 backdrop-blur-sm border-success/50 p-3">
            <div className="flex items-center gap-3">
              <div
                className="h-3 w-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: ROUTE_DEFINITIONS.find(r => r.key === activeRoute)?.color }}
              />
              <div>
                <p className="text-xs text-muted-foreground">Active Route</p>
                <p className="text-sm font-semibold">
                  {ROUTE_DEFINITIONS.find(r => r.key === activeRoute)?.name}
                </p>
                {activeRouteData && (
                  <p className={`text-xs ${activeRouteData.congestion >= 60 ? 'text-destructive' : activeRouteData.congestion >= 30 ? 'text-warning' : 'text-success'}`}>
                    {activeRouteData.congestion}% congestion
                  </p>
                )}
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* ETA Display */}
      <div className="absolute bottom-4 right-4 z-[1000] pointer-events-auto">
        <Card className="bg-background/95 backdrop-blur-sm border-border/50 p-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-success/10">
              <Clock className="h-4 w-4 text-success" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Estimated Arrival</p>
              <p className="text-lg font-bold font-mono text-success">
                {activeRouteData?.estimatedTime || ROUTE_DEFINITIONS.find(r => r.key === activeRoute)?.baseTime || '--'} min
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
