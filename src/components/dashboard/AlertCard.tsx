import { AlertTriangle, Clock, MapPin, ArrowRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface Alert {
  id: string;
  type: "reroute" | "accident" | "congestion" | "roadblock";
  title: string;
  message: string;
  location: string;
  timestamp: Date;
  severity: "low" | "medium" | "high" | "critical";
  alternateRoute?: string;
}

interface AlertCardProps {
  alert: Alert;
  onDismiss?: (id: string) => void;
  onViewRoute?: (id: string) => void;
}

export function AlertCard({ alert, onDismiss, onViewRoute }: AlertCardProps) {
  const severityStyles = {
    low: "border-info/30 bg-info/5",
    medium: "border-warning/30 bg-warning/5",
    high: "border-emergency/30 bg-emergency/5",
    critical: "border-emergency/50 bg-emergency/10 pulse-emergency",
  };

  const severityIcons = {
    low: "text-info",
    medium: "text-warning",
    high: "text-emergency",
    critical: "text-emergency",
  };

  const typeLabels = {
    reroute: "Reroute Required",
    accident: "Accident Reported",
    congestion: "Heavy Congestion",
    roadblock: "Road Blocked",
  };

  return (
    <div className={cn(
      "relative rounded-xl border p-4 alert-slide-in",
      severityStyles[alert.severity]
    )}>
      {onDismiss && (
        <Button 
          variant="ghost" 
          size="icon" 
          className="absolute top-2 right-2 h-6 w-6 opacity-60 hover:opacity-100"
          onClick={() => onDismiss(alert.id)}
        >
          <X className="h-4 w-4" />
        </Button>
      )}
      
      <div className="flex gap-3">
        <div className={cn("mt-0.5", severityIcons[alert.severity])}>
          <AlertTriangle className="h-5 w-5" />
        </div>
        
        <div className="flex-1 space-y-2 pr-6">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {typeLabels[alert.type]}
            </span>
          </div>
          
          <h4 className="font-semibold">{alert.title}</h4>
          <p className="text-sm text-muted-foreground">{alert.message}</p>
          
          <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              <span>{alert.location}</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              <span>{alert.timestamp.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</span>
            </div>
          </div>
          
          {alert.alternateRoute && (
            <div className="pt-2">
              <Button 
                variant="outline" 
                size="sm" 
                className="h-8 text-xs"
                onClick={() => onViewRoute?.(alert.id)}
              >
                View Alternate Route
                <ArrowRight className="ml-1 h-3 w-3" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
