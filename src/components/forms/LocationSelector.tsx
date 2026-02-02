import { useState, useMemo } from "react";
import { Check, ChevronsUpDown, MapPin, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { VIZAG_LOCATIONS, type VizagLocation } from "@/utils/vizagLocations";

interface LocationSelectorProps {
  value: string;
  onChange: (value: string, coordinates: { lat: number; lng: number }) => void;
  placeholder?: string;
  variant?: "source" | "destination";
  excludeLocation?: string;
}

export function LocationSelector({
  value,
  onChange,
  placeholder = "Select location...",
  variant = "source",
  excludeLocation,
}: LocationSelectorProps) {
  const [open, setOpen] = useState(false);

  const locations = useMemo(() => {
    return VIZAG_LOCATIONS
      .filter(loc => loc.name !== excludeLocation && loc.name.trim() !== "")
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [excludeLocation]);

  const selectedLocation = useMemo(() => {
    return VIZAG_LOCATIONS.find(loc => loc.name === value);
  }, [value]);

  const iconColor = variant === "source" ? "text-success" : "text-emergency";
  const borderColor = variant === "source" ? "border-success/30" : "border-emergency/30";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "w-full justify-between bg-secondary/30 h-10",
            value && borderColor
          )}
        >
          <div className="flex items-center gap-2 truncate">
            <MapPin className={cn("h-4 w-4 flex-shrink-0", iconColor)} />
            <span className={cn("truncate", !value && "text-muted-foreground")}>
              {value || placeholder}
            </span>
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search location..." />
          <CommandList>
            <CommandEmpty>No location found.</CommandEmpty>
            <CommandGroup heading="Vizag Locations (OSM Data)">
              {locations.map((location) => (
                <CommandItem
                  key={location.name}
                  value={location.name}
                  onSelect={() => {
                    onChange(location.name, { lat: location.lat, lng: location.lng });
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === location.name ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <div className="flex flex-col">
                    <span className="text-sm">{location.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {location.lat.toFixed(4)}, {location.lng.toFixed(4)}
                    </span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
