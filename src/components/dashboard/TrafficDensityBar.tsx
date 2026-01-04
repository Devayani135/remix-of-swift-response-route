import { cn } from "@/lib/utils";

interface TrafficDensityBarProps {
  label: string;
  density: number; // 0-100
  location?: string;
}

export function TrafficDensityBar({ label, density, location }: TrafficDensityBarProps) {
  const getTrafficLevel = (density: number) => {
    if (density < 30) return { label: "Clear", class: "traffic-bar-clear", color: "text-traffic-clear" };
    if (density < 55) return { label: "Moderate", class: "traffic-bar-moderate", color: "text-traffic-moderate" };
    if (density < 80) return { label: "Heavy", class: "traffic-bar-heavy", color: "text-traffic-heavy" };
    return { label: "Congested", class: "traffic-bar-congested", color: "text-traffic-congested" };
  };

  const level = getTrafficLevel(density);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2">
          <span className="font-medium">{label}</span>
          {location && <span className="text-xs text-muted-foreground">({location})</span>}
        </div>
        <div className="flex items-center gap-2">
          <span className={cn("text-xs font-medium", level.color)}>{level.label}</span>
          <span className="text-xs font-mono text-muted-foreground">{density}%</span>
        </div>
      </div>
      <div className="h-2 w-full rounded-full bg-secondary/50 overflow-hidden">
        <div 
          className={cn("traffic-bar", level.class)}
          style={{ width: `${density}%` }}
        />
      </div>
    </div>
  );
}
