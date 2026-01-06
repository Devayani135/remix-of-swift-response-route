import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { AlertTriangle, Navigation, Zap, Car, Clock } from "lucide-react";

// Real coordinates for Hyderabad route (Gachibowli to LB Nagar)
const GACHIBOWLI = { lat: 17.4400, lng: 78.3489 };
const LB_NAGAR = { lat: 17.3457, lng: 78.5522 };

// Multiple route options with real intermediate points
const ROUTES = {
  primary: {
    name: "Via Mehdipatnam (Shortest)",
    color: "#22c55e",
    distance: "12.3 km",
    time: "8 min",
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
    name: "Via Kukatpally (Alternate)",
    color: "#3b82f6",
    distance: "18.5 km",
    time: "14 min",
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
    distance: "22.1 km",
    time: "16 min",
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

// Simulated CCTV camera locations (AI City dataset reference)
const CCTV_LOCATIONS = [
  { id: "cam-1", lat: 17.4285, lng: 78.3650, name: "Gachibowli Junction", vehicleCount: 45, density: 72 },
  { id: "cam-2", lat: 17.4150, lng: 78.3820, name: "Tolichowki", vehicleCount: 38, density: 58 },
  { id: "cam-3", lat: 17.3950, lng: 78.4150, name: "Mehdipatnam", vehicleCount: 67, density: 89 },
  { id: "cam-4", lat: 17.3850, lng: 78.4450, name: "Attapur", vehicleCount: 32, density: 45 },
  { id: "cam-5", lat: 17.3700, lng: 78.4800, name: "Dilsukhnagar", vehicleCount: 55, density: 78 },
  { id: "cam-6", lat: 17.3550, lng: 78.5150, name: "Kothapet", vehicleCount: 28, density: 35 },
];

// Accident/incident locations for simulation
const INCIDENTS = [
  { id: "inc-1", lat: 17.3950, lng: 78.4150, type: "accident", description: "Two-vehicle collision" },
];

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

  useEffect(() => {
    setShowIncident(accidentDetected);
  }, [accidentDetected]);

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

      polyline.bindPopup(`
        <b>${route.name}</b><br>
        Distance: ${route.distance}<br>
        Est. Time: ${route.time}
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

  // Update route styling based on active route
  useEffect(() => {
    Object.entries(routeLayersRef.current).forEach(([key, polyline]) => {
      if (key === activeRoute) {
        polyline.setStyle({ weight: 6, opacity: 1, dashArray: undefined });
        polyline.bringToFront();
      } else if (showAlternate) {
        polyline.setStyle({ weight: 4, opacity: 0.5, dashArray: "10, 10" });
      } else {
        polyline.setStyle({ opacity: 0 });
      }
    });
  }, [activeRoute, showAlternate]);

  return (
    <div className="relative h-full min-h-[450px] rounded-lg overflow-hidden">
      {/* Map Container */}
      <div ref={mapRef} className="absolute inset-0 z-0" />

      {/* Overlay Controls */}
      <div className="absolute top-4 left-4 right-4 z-[1000] flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-2 pointer-events-auto">
          <Badge variant="outline" className="bg-background/90 backdrop-blur-sm border-primary/30">
            <Navigation className="mr-1 h-3 w-3 text-primary" />
            OpenStreetMap
          </Badge>
          <Badge variant="outline" className="bg-background/90 backdrop-blur-sm border-info/30 text-info">
            <Car className="mr-1 h-3 w-3" />
            AI City Dataset
          </Badge>
        </div>

        <div className="flex gap-2 pointer-events-auto">
          {Object.entries(ROUTES).map(([key, route]) => (
            <Badge
              key={key}
              variant="outline"
              className={`cursor-pointer transition-all ${
                activeRoute === key
                  ? "bg-background/95 border-2"
                  : "bg-background/70 opacity-70 hover:opacity-100"
              }`}
              style={{ borderColor: route.color }}
              onClick={() => onRouteChange?.(key)}
            >
              <div
                className="mr-1.5 h-2 w-2 rounded-full"
                style={{ backgroundColor: route.color }}
              />
              {route.distance}
            </Badge>
          ))}
        </div>
      </div>

      {/* Accident Alert Banner */}
      {showIncident && (
        <div className="absolute top-16 left-4 right-4 z-[1000] pointer-events-none">
          <Card className="bg-emergency/95 border-emergency text-emergency-foreground p-3 pointer-events-auto animate-pulse">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5" />
              <div className="flex-1">
                <p className="font-semibold text-sm">Accident Detected at Mehdipatnam!</p>
                <p className="text-xs opacity-90">YOLOv8 detection • Alternate route via Kukatpally recommended</p>
              </div>
              <Badge variant="outline" className="bg-white/20 border-white/30 text-white">
                Switch Route
              </Badge>
            </div>
          </Card>
        </div>
      )}

      {/* Route Legend */}
      <div className="absolute bottom-4 left-4 z-[1000] pointer-events-auto">
        <Card className="bg-background/95 backdrop-blur-sm border-border/50 p-3">
          <p className="text-xs font-semibold mb-2 text-muted-foreground">Routes (Click to select)</p>
          <div className="space-y-1.5">
            {Object.entries(ROUTES).map(([key, route]) => (
              <div
                key={key}
                className={`flex items-center gap-2 text-xs cursor-pointer p-1 rounded transition-colors ${
                  activeRoute === key ? "bg-primary/10" : "hover:bg-muted/50"
                }`}
                onClick={() => onRouteChange?.(key)}
              >
                <div
                  className="h-1 w-6 rounded-full"
                  style={{ backgroundColor: route.color }}
                />
                <span className={activeRoute === key ? "font-semibold" : "text-muted-foreground"}>
                  {route.name}
                </span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* ETA Display */}
      <div className="absolute bottom-4 right-4 z-[1000] pointer-events-auto">
        <Card className="bg-background/95 backdrop-blur-sm border-border/50 p-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-primary/10">
              <Zap className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Estimated Arrival</p>
              <div className="flex items-center gap-2">
                <Clock className="h-3 w-3 text-muted-foreground" />
                <p className="text-lg font-bold font-mono">
                  {ROUTES[activeRoute as keyof typeof ROUTES]?.time || "8 min"}
                </p>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Dataset Info */}
      <div className="absolute bottom-20 right-4 z-[1000] pointer-events-auto">
        <Card className="bg-background/90 backdrop-blur-sm border-border/50 p-2 text-xs">
          <p className="text-muted-foreground">Data Sources:</p>
          <p className="font-mono text-[10px]">• AI City Track 2 & 4 (2021)</p>
          <p className="font-mono text-[10px]">• OpenStreetMap</p>
        </Card>
      </div>
    </div>
  );
}
