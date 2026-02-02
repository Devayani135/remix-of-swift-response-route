import { useState } from "react";
import { Car, Truck, Ambulance, Flame, ShieldAlert, Navigation2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { LocationSelector } from "./LocationSelector";
import { cn } from "@/lib/utils";
import { DEFAULT_SOURCE_VIZAG, DEFAULT_DESTINATION_VIZAG } from "@/utils/vizagLocations";

type VehicleType = "ambulance" | "fire" | "police" | "rescue";

interface VehicleOption {
  type: VehicleType;
  label: string;
  icon: typeof Ambulance;
  color: string;
}

const vehicleOptions: VehicleOption[] = [
  { type: "ambulance", label: "Ambulance", icon: Ambulance, color: "text-emergency" },
  { type: "fire", label: "Fire Truck", icon: Flame, color: "text-warning" },
  { type: "police", label: "Police", icon: ShieldAlert, color: "text-info" },
  { type: "rescue", label: "Rescue", icon: Truck, color: "text-success" },
];

interface VehicleDispatchFormProps {
  onDispatch?: (data: DispatchData) => void;
}

export interface DispatchData {
  vehicleId: string;
  vehicleType: VehicleType;
  driverName: string;
  source: string;
  destination: string;
  sourceCoordinates: { lat: number; lng: number };
  destinationCoordinates: { lat: number; lng: number };
  priority: "normal" | "urgent" | "critical";
}

export function VehicleDispatchForm({ onDispatch }: VehicleDispatchFormProps) {
  const [selectedType, setSelectedType] = useState<VehicleType>("ambulance");
  const [formData, setFormData] = useState<{
    vehicleId: string;
    driverName: string;
    source: string;
    destination: string;
    sourceCoordinates: { lat: number; lng: number };
    destinationCoordinates: { lat: number; lng: number };
    priority: "normal" | "urgent" | "critical";
  }>({
    vehicleId: "",
    driverName: "",
    source: DEFAULT_SOURCE_VIZAG.name,
    destination: DEFAULT_DESTINATION_VIZAG.name,
    sourceCoordinates: { lat: DEFAULT_SOURCE_VIZAG.lat, lng: DEFAULT_SOURCE_VIZAG.lng },
    destinationCoordinates: { lat: DEFAULT_DESTINATION_VIZAG.lat, lng: DEFAULT_DESTINATION_VIZAG.lng },
    priority: "urgent",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    onDispatch?.({
      ...formData,
      vehicleType: selectedType,
    });
    
    setIsSubmitting(false);
  };

  const handleSourceChange = (name: string, coordinates: { lat: number; lng: number }) => {
    setFormData(prev => ({
      ...prev,
      source: name,
      sourceCoordinates: coordinates,
    }));
  };

  const handleDestinationChange = (name: string, coordinates: { lat: number; lng: number }) => {
    setFormData(prev => ({
      ...prev,
      destination: name,
      destinationCoordinates: coordinates,
    }));
  };

  return (
    <Card className="border-border/50 card-hover">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2">
          <Car className="h-5 w-5 text-primary" />
          Vehicle Dispatch
        </CardTitle>
        <CardDescription>
          Register emergency vehicle and request optimal route in Visakhapatnam
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Vehicle Type Selection */}
          <div className="space-y-2">
            <Label>Vehicle Type</Label>
            <div className="grid grid-cols-4 gap-2">
              {vehicleOptions.map((option) => (
                <button
                  key={option.type}
                  type="button"
                  onClick={() => setSelectedType(option.type)}
                  className={cn(
                    "flex flex-col items-center gap-1.5 rounded-lg border p-3 transition-all duration-200",
                    selectedType === option.type
                      ? "border-primary bg-primary/10 ring-1 ring-primary/50"
                      : "border-border hover:border-muted-foreground/30 hover:bg-accent/50"
                  )}
                >
                  <option.icon className={cn("h-5 w-5", option.color)} />
                  <span className="text-xs font-medium">{option.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Vehicle Details */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="vehicleId">Vehicle ID</Label>
              <Input
                id="vehicleId"
                placeholder="AP-31-1234"
                value={formData.vehicleId}
                onChange={(e) => setFormData(prev => ({ ...prev, vehicleId: e.target.value }))}
                className="bg-secondary/30"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="driverName">Driver Name</Label>
              <Input
                id="driverName"
                placeholder="Enter driver name"
                value={formData.driverName}
                onChange={(e) => setFormData(prev => ({ ...prev, driverName: e.target.value }))}
                className="bg-secondary/30"
              />
            </div>
          </div>

          {/* Route Selection with Location Dropdowns */}
          <div className="space-y-3">
            <Label>Route (Select from Vizag OSM Data)</Label>
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <LocationSelector
                  value={formData.source}
                  onChange={handleSourceChange}
                  placeholder="Select source..."
                  variant="source"
                  excludeLocation={formData.destination}
                />
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 border border-primary/20 flex-shrink-0">
                <Navigation2 className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1">
                <LocationSelector
                  value={formData.destination}
                  onChange={handleDestinationChange}
                  placeholder="Select destination..."
                  variant="destination"
                  excludeLocation={formData.source}
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              📍 {formData.sourceCoordinates.lat.toFixed(4)}, {formData.sourceCoordinates.lng.toFixed(4)} → {formData.destinationCoordinates.lat.toFixed(4)}, {formData.destinationCoordinates.lng.toFixed(4)}
            </p>
          </div>

          {/* Priority Selection */}
          <div className="space-y-2">
            <Label>Priority Level</Label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { value: "normal", label: "Normal", color: "text-muted-foreground" },
                { value: "urgent", label: "Urgent", color: "text-warning" },
                { value: "critical", label: "Critical", color: "text-emergency" },
              ].map((priority) => (
                <button
                  key={priority.value}
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, priority: priority.value as any }))}
                  className={cn(
                    "rounded-lg border px-3 py-2 text-sm font-medium transition-all duration-200",
                    formData.priority === priority.value
                      ? priority.value === "critical" 
                        ? "border-emergency bg-emergency/10 ring-1 ring-emergency/50 text-emergency"
                        : priority.value === "urgent"
                        ? "border-warning bg-warning/10 ring-1 ring-warning/50 text-warning"
                        : "border-primary bg-primary/10 ring-1 ring-primary/50"
                      : "border-border hover:bg-accent/50"
                  )}
                >
                  {priority.label}
                </button>
              ))}
            </div>
          </div>

          {/* Submit Button */}
          <Button 
            type="submit" 
            variant={formData.priority === "critical" ? "emergency" : "glow"}
            className="w-full"
            size="lg"
            disabled={isSubmitting || !formData.vehicleId || !formData.driverName}
          >
            {isSubmitting ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                Computing Route (Dijkstra/A*)...
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                Dispatch & Calculate Route
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
