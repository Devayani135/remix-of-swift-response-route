import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Navigation, RefreshCw, Clock, Route, MapPin, Loader2, Wifi, AlertTriangle, Car, Play, Pause, Download } from "lucide-react";
import { toast } from "sonner";
import { useTomTomTraffic } from "@/hooks/useTomTomTraffic";
import { useLiveNavigation, type RoutePoint } from "@/hooks/useLiveNavigation";
import { filterToMajorIncidents, getIncidentColor, getIncidentIcon, type FilteredIncident } from "@/utils/incidentFilter";

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
  const vehicleMarkerRef = useRef<L.Marker | null>(null);
  const routeLayersRef = useRef<{ [key: string]: L.Polyline }>({});
  const liveRouteLayerRef = useRef<L.Polyline | null>(null);
  const incidentMarkersRef = useRef<L.Marker[]>([]);
  const startMarkerRef = useRef<L.Marker | null>(null);
  const [showAllRoutes, setShowAllRoutes] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [majorIncidents, setMajorIncidents] = useState<FilteredIncident[]>([]);

  // Get current source location (user location or default)
  const sourceLocation = userLocation || DEFAULT_SOURCE;

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

  // Use live navigation hook for real-time vehicle tracking
  const {
    currentRoute: liveRoute,
    vehiclePosition,
    vehicleProgress,
    majorIncidents: navIncidents,
    isNavigating,
    isRerouting,
    startNavigation,
    stopNavigation,
    refresh: refreshNavigation,
  } = useLiveNavigation(sourceLocation, LB_NAGAR, onRouteChange);

  // Filter incidents to major ones only
  useEffect(() => {
    const rawIncidents = getIncidentsForRoute(activeRoute);
    const filtered = filterToMajorIncidents(rawIncidents);
    setMajorIncidents(filtered);
  }, [activeRoute, getIncidentsForRoute]);

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

    // OpenStreetMap tiles as base map (local OSM data reference)
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);

    // Apply dark theme styling
    map.getContainer().style.filter = "hue-rotate(180deg) invert(0.9)";

    mapInstanceRef.current = map;

    // Start marker
    const startIcon = L.divIcon({
      className: "custom-marker",
      html: `<div style="background: #22c55e; width: 28px; height: 28px; border-radius: 50%; border: 3px solid white; box-shadow: 0 4px 12px rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center;">
        <span style="color: white; font-size: 14px; font-weight: bold;">S</span>
      </div>`,
      iconSize: [28, 28],
      iconAnchor: [14, 14],
    });

    // End marker
    const endIcon = L.divIcon({
      className: "custom-marker",
      html: `<div style="background: #ef4444; width: 28px; height: 28px; border-radius: 50%; border: 3px solid white; box-shadow: 0 4px 12px rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center;">
        <span style="color: white; font-size: 14px; font-weight: bold;">E</span>
      </div>`,
      iconSize: [28, 28],
      iconAnchor: [14, 14],
    });

    const startMarker = L.marker([sourceLocation.lat, sourceLocation.lng], { icon: startIcon })
      .addTo(map)
      .bindPopup(userLocation ? "<b>Your Location</b><br>Start Point" : "<b>Gachibowli</b><br>Start Point");
    startMarkerRef.current = startMarker;

    L.marker([LB_NAGAR.lat, LB_NAGAR.lng], { icon: endIcon })
      .addTo(map)
      .bindPopup("<b>LB Nagar</b><br>Destination");

    // Draw routes with Google Maps-like styling (thick, rounded, smooth)
    ROUTE_DEFINITIONS.forEach((route) => {
      // Create shadow/outline layer for depth
      const shadowPolyline = L.polyline(route.coordinates, {
        color: '#000000',
        weight: route.key === "primary" ? 10 : 7,
        opacity: 0.3,
        lineCap: 'round',
        lineJoin: 'round',
      }).addTo(map);

      // Main route polyline with smooth styling
      const polyline = L.polyline(route.coordinates, {
        color: route.color,
        weight: route.key === "primary" ? 7 : 5,
        opacity: route.key === "primary" ? 1 : 0.7,
        lineCap: 'round',
        lineJoin: 'round',
        dashArray: route.key === "primary" ? undefined : "12, 8",
      }).addTo(map);

      polyline.on("click", () => {
        onRouteChange?.(route.key);
      });

      routeLayersRef.current[route.key] = polyline;
    });

    // Emergency vehicle marker with animated pulse
    const vehicleIcon = L.divIcon({
      className: "vehicle-marker",
      html: `<div style="position: relative;">
        <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 50px; height: 50px; background: rgba(239, 68, 68, 0.3); border-radius: 50%; animation: pulse 1s infinite;"></div>
        <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 35px; height: 35px; background: rgba(239, 68, 68, 0.5); border-radius: 50%; animation: pulse 1.5s infinite;"></div>
        <div style="background: linear-gradient(145deg, #ff6b6b, #ef4444); width: 36px; height: 24px; border-radius: 8px; border: 3px solid white; box-shadow: 0 4px 12px rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; position: relative;">
          <div style="position: absolute; top: -8px; left: 6px; width: 10px; height: 6px; background: #3b82f6; border-radius: 3px; animation: blink 0.5s infinite;"></div>
          <div style="position: absolute; top: -8px; right: 6px; width: 10px; height: 6px; background: #ef4444; border-radius: 3px; animation: blink 0.5s infinite 0.25s;"></div>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
            <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9L17 10V8c0-.6-.4-1-1-1H8c-.6 0-1 .4-1 1v6H4c-.6 0-1 .4-1 1v2c0 .6.4 1 1 1h2"/>
            <circle cx="7" cy="17" r="2"/>
            <circle cx="17" cy="17" r="2"/>
          </svg>
        </div>
      </div>`,
      iconSize: [36, 24],
      iconAnchor: [18, 12],
    });

    const vehicleMarker = L.marker([sourceLocation.lat, sourceLocation.lng], { icon: vehicleIcon }).addTo(map);
    vehicleMarkerRef.current = vehicleMarker;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [onRouteChange, sourceLocation, userLocation]);

  // Update vehicle position from live navigation
  useEffect(() => {
    if (!vehicleMarkerRef.current || !vehiclePosition) return;
    vehicleMarkerRef.current.setLatLng([vehiclePosition.lat, vehiclePosition.lng]);
  }, [vehiclePosition]);

  // Draw live route from TomTom when available
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    // Remove previous live route
    if (liveRouteLayerRef.current) {
      liveRouteLayerRef.current.remove();
      liveRouteLayerRef.current = null;
    }

    // Draw live calculated route if available
    if (liveRoute && liveRoute.coordinates.length > 1) {
      const coords: [number, number][] = liveRoute.coordinates.map(c => [c.lat, c.lng]);
      
      // Shadow layer
      L.polyline(coords, {
        color: '#000000',
        weight: 12,
        opacity: 0.25,
        lineCap: 'round',
        lineJoin: 'round',
      }).addTo(mapInstanceRef.current);

      // Main route with gradient-like effect
      const liveRoutePolyline = L.polyline(coords, {
        color: '#22c55e',
        weight: 8,
        opacity: 1,
        lineCap: 'round',
        lineJoin: 'round',
      }).addTo(mapInstanceRef.current);

      liveRouteLayerRef.current = liveRoutePolyline;
      liveRoutePolyline.bringToFront();
    }
  }, [liveRoute]);

  // Update incident markers - only major incidents
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    // Clear existing incident markers
    incidentMarkersRef.current.forEach(marker => marker.remove());
    incidentMarkersRef.current = [];

    // Only show major incidents (accidents, road work, heavy traffic)
    majorIncidents.forEach((incident) => {
      const color = getIncidentColor(incident.type);
      const icon = getIncidentIcon(incident.type);
      
      const incidentIcon = L.divIcon({
        className: "incident-marker",
        html: `<div style="position: relative;">
          <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 60px; height: 60px; background: ${color}40; border-radius: 50%; animation: pulse 0.8s infinite;"></div>
          <div style="background: ${color}; width: 32px; height: 32px; border-radius: 50%; border: 3px solid white; box-shadow: 0 4px 12px rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center;">
            ${icon}
          </div>
        </div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

      const marker = L.marker([incident.location.lat, incident.location.lng], { icon: incidentIcon })
        .addTo(mapInstanceRef.current!)
        .bindPopup(`
          <div style="color: ${color}; min-width: 180px;">
            <b>⚠️ ${incident.type.replace(/_/g, ' ')}</b><br>
            <p style="margin: 4px 0; color: #666;">${incident.description}</p>
            ${incident.delay > 0 ? `<small style="color: #ef4444;">Expected delay: +${Math.round(incident.delay / 60)} min</small>` : ''}
          </div>
        `);

      incidentMarkersRef.current.push(marker);
    });
  }, [majorIncidents]);

  // Animate vehicle along predefined route when not using live navigation
  useEffect(() => {
    if (liveRoute) return; // Skip if using live navigation

    const route = ROUTE_DEFINITIONS.find(r => r.key === activeRoute);
    if (!route || !vehicleMarkerRef.current) return;

    const coords = route.coordinates;
    let progress = 0;
    let lastRerouteCheck = 0;
    
    const animate = () => {
      progress = (progress + 0.2) % 100;
      const totalPoints = coords.length - 1;
      const segment = Math.floor((progress / 100) * totalPoints);
      const segProgress = ((progress / 100) * totalPoints) % 1;

      if (segment < totalPoints) {
        const start = coords[segment];
        const end = coords[segment + 1];
        const lat = start[0] + (end[0] - start[0]) * segProgress;
        const lng = start[1] + (end[1] - start[1]) * segProgress;
        vehicleMarkerRef.current?.setLatLng([lat, lng]);
        
        // Check for incidents ahead every 10% progress
        if (Math.floor(progress / 10) > Math.floor(lastRerouteCheck / 10)) {
          lastRerouteCheck = progress;
          
          // Check if major incident is ahead
          if (majorIncidents.length > 0 && fastestRoute && fastestRoute !== activeRoute) {
            const incidentAhead = majorIncidents.some(incident => {
              for (let i = segment + 1; i < coords.length; i++) {
                const coord = coords[i];
                const distance = Math.sqrt(
                  Math.pow(coord[0] - incident.location.lat, 2) + 
                  Math.pow(coord[1] - incident.location.lng, 2)
                );
                if (distance < 0.015) return true;
              }
              return false;
            });
            
            if (incidentAhead) {
              const incidentType = majorIncidents[0].type.replace(/_/g, ' ').toLowerCase();
              toast.warning(
                `⚠️ ${incidentType} detected ahead! Rerouting...`,
                { 
                  duration: 5000,
                  action: {
                    label: "Switch Route",
                    onClick: () => onRouteChange?.(fastestRoute)
                  }
                }
              );
            }
          }
        }
      }
    };

    const interval = setInterval(animate, 100);
    return () => clearInterval(interval);
  }, [activeRoute, fastestRoute, majorIncidents, liveRoute, onRouteChange]);

  // Update route styling
  useEffect(() => {
    Object.entries(routeLayersRef.current).forEach(([key, polyline]) => {
      const routeData = routesWithTraffic.find(r => r.key === key);
      const routeDef = ROUTE_DEFINITIONS.find(r => r.key === key);
      
      if (key === activeRoute) {
        polyline.setStyle({ 
          weight: 7, 
          opacity: 1, 
          dashArray: undefined,
          lineCap: 'round',
          lineJoin: 'round',
        });
        polyline.bringToFront();
        
        if (routeData && routeDef) {
          polyline.setPopupContent(`
            <div style="min-width: 160px;">
              <b style="color: ${routeDef.color};">${routeDef.name}</b><br>
              <span style="color: #666;">Distance: ${routeDef.distance} km</span><br>
              <span style="color: ${routeData.congestion > 60 ? '#ef4444' : routeData.congestion > 30 ? '#f59e0b' : '#22c55e'}">
                Traffic: ${routeData.congestion}% congested
              </span><br>
              <b>Est. Time: ${routeData.estimatedTime} min</b>
            </div>
          `);
        }
      } else if (showAllRoutes) {
        polyline.setStyle({ weight: 5, opacity: 0.5, dashArray: "12, 8" });
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

  // Handle download OSM data
  const handleDownloadOSM = useCallback(() => {
    window.open('/data/hyderabad-road-network.csv', '_blank');
    toast.success("Downloading Hyderabad road network data...");
  }, []);

  // Get active route data
  const activeRouteData = useMemo(() => {
    return routesWithTraffic.find(r => r.key === activeRoute);
  }, [routesWithTraffic, activeRoute]);

  const canReroute = fastestRoute && fastestRoute !== activeRoute;

  return (
    <div className="relative h-full min-h-[450px] rounded-lg overflow-hidden">
      {/* CSS for animations */}
      <style>{`
        @keyframes pulse {
          0% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
          100% { transform: translate(-50%, -50%) scale(1.5); opacity: 0; }
        }
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `}</style>

      {/* Map Container */}
      <div ref={mapRef} className="absolute inset-0 z-0" />

      {/* Top Controls */}
      <div className="absolute top-4 left-4 right-4 z-[1000] flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-2 pointer-events-auto flex-wrap">
          <Badge variant="outline" className="bg-background/90 backdrop-blur-sm border-primary/30">
            <Wifi className={`mr-1 h-3 w-3 ${isLoading ? 'animate-pulse' : ''} text-primary`} />
            TomTom Live
          </Badge>
          {lastUpdate && (
            <Badge variant="outline" className="bg-background/90 backdrop-blur-sm border-muted text-muted-foreground text-xs">
              Updated: {lastUpdate.toLocaleTimeString()}
            </Badge>
          )}
          {majorIncidents.length > 0 && (
            <Badge variant="outline" className="bg-destructive/10 backdrop-blur-sm border-destructive/30 text-destructive animate-pulse">
              <AlertTriangle className="mr-1 h-3 w-3" />
              {majorIncidents.length} Alert{majorIncidents.length > 1 ? 's' : ''} on route
            </Badge>
          )}
          {liveRoute && (
            <Badge variant="outline" className="bg-success/10 backdrop-blur-sm border-success/30 text-success">
              <Route className="mr-1 h-3 w-3" />
              {liveRoute.algorithm === 'astar' ? 'A*' : 'Dijkstra'} | {liveRoute.distance} km
            </Badge>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 pointer-events-auto flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => isNavigating ? stopNavigation() : startNavigation()}
            className="bg-background/90 backdrop-blur-sm border-primary"
          >
            {isNavigating ? <Pause className="mr-1.5 h-3.5 w-3.5" /> : <Play className="mr-1.5 h-3.5 w-3.5" />}
            {isNavigating ? "Pause" : "Start"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleReroute}
            disabled={isLoading || isRerouting}
            className={`bg-background/90 backdrop-blur-sm ${
              canReroute 
                ? "border-warning text-warning hover:bg-warning/20 animate-pulse" 
                : "border-muted"
            }`}
          >
            <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${isLoading || isRerouting ? 'animate-spin' : ''}`} />
            {isRerouting ? "Rerouting..." : canReroute ? "Reroute Now" : "Refresh"}
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
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadOSM}
            className="bg-background/90 backdrop-blur-sm"
          >
            <Download className="mr-1.5 h-3.5 w-3.5" />
            OSM Data
          </Button>
        </div>
      </div>

      {/* Major Incident Alert Banner */}
      {majorIncidents.length > 0 && (
        <div className="absolute top-20 left-4 right-4 z-[1000] pointer-events-auto">
          <Card className="bg-destructive/90 backdrop-blur-sm border-destructive p-3">
            <div className="flex items-center gap-3 text-destructive-foreground">
              <AlertTriangle className="h-5 w-5 animate-pulse" />
              <div className="flex-1">
                <p className="font-semibold text-sm">
                  {majorIncidents[0].type.replace(/_/g, ' ')} on Active Route
                </p>
                <p className="text-xs opacity-90">{majorIncidents[0].description}</p>
              </div>
              {canReroute && (
                <Button 
                  size="sm" 
                  variant="secondary"
                  onClick={() => onRouteChange?.(fastestRoute!)}
                  className="text-xs"
                >
                  Switch Route
                </Button>
              )}
            </div>
          </Card>
        </div>
      )}

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
                      className="h-1.5 w-8 rounded-full flex-shrink-0"
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

      {/* Active Route Info with Algorithm Display */}
      {!showAllRoutes && (
        <div className="absolute bottom-4 left-4 z-[1000] pointer-events-auto">
          <Card className="bg-background/95 backdrop-blur-sm border-success/50 p-3">
            <div className="flex items-center gap-3">
              <div
                className="h-4 w-4 rounded-full flex-shrink-0"
                style={{ backgroundColor: ROUTE_DEFINITIONS.find(r => r.key === activeRoute)?.color }}
              />
              <div>
                <p className="text-xs text-muted-foreground">Active Route</p>
                <p className="text-sm font-semibold">
                  {ROUTE_DEFINITIONS.find(r => r.key === activeRoute)?.name}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  {activeRouteData && (
                    <span className={`text-xs ${activeRouteData.congestion >= 60 ? 'text-destructive' : activeRouteData.congestion >= 30 ? 'text-warning' : 'text-success'}`}>
                      {activeRouteData.congestion}% congestion
                    </span>
                  )}
                  <Badge variant="outline" className="text-[9px] px-1.5 py-0 bg-primary/10 border-primary/30">
                    {liveRoute?.algorithm === 'astar' ? 'A*' : activeRoute === 'primary' ? 'Dijkstra' : 'A*'}
                  </Badge>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* ETA Display with Navigation Progress */}
      <div className="absolute bottom-4 right-4 z-[1000] pointer-events-auto">
        <Card className="bg-background/95 backdrop-blur-sm border-border/50 p-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-success/10">
              <Clock className="h-4 w-4 text-success" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Estimated Arrival</p>
              <p className="text-lg font-bold font-mono text-success">
                {liveRoute?.estimatedTime || activeRouteData?.estimatedTime || ROUTE_DEFINITIONS.find(r => r.key === activeRoute)?.baseTime || '--'} min
              </p>
              <div className="flex items-center gap-2 mt-1">
                <div className="w-20 h-1.5 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-success rounded-full transition-all duration-300"
                    style={{ width: `${vehicleProgress}%` }}
                  />
                </div>
                <span className="text-[10px] text-muted-foreground">
                  {Math.round(vehicleProgress)}%
                </span>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
